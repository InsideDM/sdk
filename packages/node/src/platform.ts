import {BusinessClient,collection} from './client.js';
import {Transport} from './transport.js';
import {createPlatformSubscriptions} from './platformSubscriptions.js';
import {createPlatformBlueprints} from './platformBlueprints.js';
import {InsideDMConfigurationError,InsideDMProtocolError,InsideDMTransportError,InsideDMError,attachWriteRecovery} from './errors.js';
import {randomUUID} from 'node:crypto';
import {isIdempotencyKey} from './generated/idempotency.js';
import {parseApplicationSelf,type PublicApplicationSelf} from './generated/applicationSelf.js';
import {parseCreateOnboardingSession,parseOnboardingSessionId,parseOnboardingSession,parseCreatedOnboardingSession,
  type CreateOnboardingSessionInput,type PublicOnboardingSession,type CreatedOnboardingSession} from './generated/onboardingSessions.js';
import {parseInstallationId,parseInstallationRevoke,parsePublicInstallation,type PublicInstallation,type RevokeInstallationInput} from './generated/installations.js';
import {parsePortfolioBusinessId,parsePartnerBusiness,parsePartnerBusinessPage,type PublicPartnerBusiness,type PartnerBusinessListParams,type PartnerBusinessPage} from './generated/partnerPortfolio.js';
import {capturePartnerUsageQuery,parsePartnerApiUsage,type PublicPartnerApiUsage} from './generated/partnerUsage.js';
import {parseCreatePlatformBusiness,parseRenewBusinessClaimLink,parseBusinessCreationId,parseBusinessCreation,parseBusinessCreationLink,
  type CreatePlatformBusinessInput,type RenewBusinessClaimLinkInput,type PublicBusinessCreation,type BusinessCreationLink} from './generated/businessCreations.js';
import {parseCreateInstallationRequest,parseCreatedInstallationRequest,parseInstallationRequest,parseInstallationRequestId,
  type CreatedInstallationRequest,type PublicInstallationRequest} from './generated/installationRequests.js';
import {parseApplicationCredential} from './generated/applicationCredential.js';
import {parseBusinessDelegation,type BusinessDelegation} from './generated/delegationExchange.js';
import {parseMachinePublicScopes,type MachinePublicScope} from './generated/vocabulary.js';
import type {ClientSettings,RequestOptions,WriteRequestOptions,Result,CreateInstallationRequestInput,PartnerApiUsageInput} from './types.js';

export interface PlatformClientOptions extends ClientSettings{
  /** Your server application credential (idmp_). Business approval is still required. */
  apiKey:string;
  accessToken?:never;
}
export interface ForBusinessOptions{
  /** Optional narrower business scopes. Omit to use the approved installation's effective scopes. */
  scopes?:readonly MachinePublicScope[];
}
interface Flight{controller:AbortController;promise:Promise<BusinessDelegation>;waiters:number;done:boolean}
interface Entry{token:BusinessDelegation|null;flights:Map<string,Flight>}
type AcquisitionOptions=RequestOptions&{timeoutMs:number;attemptTimeoutMs:number;maxRetries:number};
const MAX_CACHE_ENTRIES=500,MAX_PENDING_EXCHANGES=100,REFRESH_SKEW_MS=30_000;
class DelegatedBusinessClient extends BusinessClient{
  constructor(transport:Transport){super(transport);}
}
function stopped(kind:'timeout'|'aborted'):InsideDMTransportError{
  return new InsideDMTransportError(kind,{code:kind==='timeout'?'request_timeout':'request_aborted',attempts:0});
}

/** One server application credential; each business still needs its own
 * merchant-approved installation. Selection itself performs no network I/O. */
export class InsideDMPlatform{
  readonly blueprints;
  readonly subscriptions;
  readonly onboarding;
  readonly usage;
  readonly businesses;
  readonly businessCreations;
  readonly installations;
  readonly self;
  readonly installationRequests;
  readonly #transport:Transport;
  readonly #options:ClientSettings;
  readonly #entries=new Map<string,Entry>();
  #pending=0;
  #applicationId:string|null=null;
  constructor(options:PlatformClientOptions){
    if(!options||!parseApplicationCredential(options.apiKey))throw new InsideDMConfigurationError('apiKey: provide the complete server application credential (idmp_) from your secret store.', 'apiKey');
    this.#transport=new Transport(options,{kind:'application',token:options.apiKey});
    this.#options={timeoutMs:options.timeoutMs,attemptTimeoutMs:options.attemptTimeoutMs,maxRetries:options.maxRetries,fetch:options.fetch};
    this.blueprints=createPlatformBlueprints(this.#transport,(id,requestId)=>{
      if(this.#applicationId!==null&&this.#applicationId!==id)throw new InsideDMProtocolError('InsideDM returned a blueprint for a different application.',{code:'invalid_response',requestId});
      this.#applicationId=id;
    },id=>this.forBusiness(id,{scopes:['flows.deploy']}));
    this.subscriptions=createPlatformSubscriptions(this.#transport,(id,requestId)=>{
      if(this.#applicationId!==null&&this.#applicationId!==id)throw new InsideDMProtocolError('InsideDM returned configuration for a different application.',{code:'invalid_response',requestId});
      this.#applicationId=id;
    });
    this.onboarding={
      /** Ask an installed business's real merchant to connect WhatsApp.
       * Keep the private URL out of logs; it grants no provider authority. */
      create:async(input:CreateOnboardingSessionInput,requestOptions:WriteRequestOptions={}):Promise<Result<CreatedOnboardingSession>>=>{
        let body:string,idempotencyKey:string,businessId:string;
        try{const captured=parseCreateOnboardingSession(JSON.stringify(input));businessId=captured.businessId;body=JSON.stringify(captured);
          idempotencyKey=requestOptions.idempotencyKey??randomUUID();if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide an installed business ID, provider whatsapp and an exact registered HTTPS return URL.');}
        try{
          const {body:answer,meta}=await this.#transport.request('createOnboardingSession',{},{},requestOptions,{body,idempotencyKey}),data=this.#onboardingAnswer(answer,true,meta.requestId);
          if(data.businessId!==businessId)throw new InsideDMProtocolError('InsideDM returned setup for a different business.',{code:'invalid_response',requestId:meta.requestId});return {data,meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'createOnboardingSession',businessId,idempotencyKey});throw error;}
      },
      /** Authenticate the setup outcome. A redirect or historical completed
       * receipt does not establish current messaging eligibility. */
      get:async(sessionId:string,requestOptions:RequestOptions={}):Promise<Result<PublicOnboardingSession>>=>{
        try{parseOnboardingSessionId(sessionId);if('idempotencyKey' in requestOptions)throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a valid setup session ID. Reads do not take an idempotency key.');}
        const {body,meta}=await this.#transport.request('getOnboardingSession',{sessionId},{},requestOptions),data=this.#onboardingAnswer(body,false,meta.requestId);
        if(data.id!==sessionId)throw new InsideDMProtocolError('InsideDM returned a different setup session.',{code:'invalid_response',requestId:meta.requestId});return {data,meta};
      },
    };
    this.usage={
      /** Recorded API counters for your own installation. Telemetry is not billing or a hard quota. */
      get:async(input:PartnerApiUsageInput,requestOptions:RequestOptions={}):Promise<Result<PublicPartnerApiUsage>>=>{
        let businessId:string,query:ReturnType<typeof capturePartnerUsageQuery>;
        try{
          if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['businessId','from','to','granularity'].includes(key)))throw new Error();
          businessId=parsePortfolioBusinessId(input.businessId);
          query=capturePartnerUsageQuery({...(input.granularity!==undefined?{granularity:input.granularity}:{}),
            ...(input.from!==undefined?{from:input.from instanceof Date?input.from.toISOString():input.from}:{}),
            ...(input.to!==undefined?{to:input.to instanceof Date?input.to.toISOString():input.to}:{})});
        }catch{throw new InsideDMConfigurationError('Provide a business ID and a bounded complete UTC day/minute window using valid dates.');}
        if(requestOptions!==null&&typeof requestOptions==='object'&&'idempotencyKey' in requestOptions)throw new InsideDMConfigurationError('Usage reads do not take an idempotency key.');
        const {body,meta}=await this.#transport.request('getPartnerApiUsage',{businessId},query,requestOptions);
        try{
          const data=parsePartnerApiUsage((body as {data:unknown}).data);
          if(data.businessId!==businessId||this.#applicationId!==null&&data.applicationId!==this.#applicationId||data.granularity!==(query.granularity??'day')
            ||query.from!==undefined&&data.from!==query.from||query.to!==undefined&&data.to!==query.to)throw new Error();
          this.#applicationId=data.applicationId;return {data,meta};
        }catch{throw new InsideDMProtocolError('InsideDM returned invalid application API telemetry.',{code:'invalid_response',requestId:meta.requestId});}
      },
    };
    this.businesses={
      ...collection<PublicPartnerBusiness,PartnerBusinessListParams>(this.#transport,'listPlatformBusinesses',{},(body,requestId)=>this.#businessPage(body,requestId)),
      /** Provision a separate workspace for its real merchant to claim. The
       * pending link grants no application access or channel readiness. */
      create:async(input:CreatePlatformBusinessInput,requestOptions:WriteRequestOptions={}):Promise<Result<BusinessCreationLink>>=>{
        let body:string,idempotencyKey:string,externalId:string;
        try{const captured=parseCreatePlatformBusiness(JSON.stringify(input));externalId=captured.externalId;body=JSON.stringify(captured);
          idempotencyKey=requestOptions.idempotencyKey??randomUUID();if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide an opaque externalId, business name, optional IANA time zone and registered HTTPS return URL.');}
        try{
          const {body:answer,meta}=await this.#transport.request('createPlatformBusiness',{},{},requestOptions,{body,idempotencyKey});
          const data=this.#creationAnswer(answer,true,meta.requestId);
          if(data.externalId!==externalId)throw new InsideDMProtocolError('InsideDM returned a different client creation.',{code:'invalid_response',requestId:meta.requestId});
          return {data,meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'createPlatformBusiness',idempotencyKey});throw error;}
      },
      /** Fresh profile metadata requires a currently active own installation. */
      get:async(businessId:string,requestOptions:RequestOptions={}):Promise<Result<PublicPartnerBusiness>>=>{
        try{parsePortfolioBusinessId(businessId);if('idempotencyKey' in requestOptions)throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a valid business ID. Reads do not take an idempotency key.');}
        const {body,meta}=await this.#transport.request('getPlatformBusiness',{businessId},{},requestOptions);
        try{
          const data=parsePartnerBusiness((body as {data:unknown}).data);
          if(data.id!==businessId||this.#applicationId!==null&&data.installation.applicationId!==this.#applicationId)throw new Error();
          this.#applicationId=data.installation.applicationId;return {data,meta};
        }catch{throw new InsideDMProtocolError('InsideDM returned invalid portfolio business metadata.',{code:'invalid_response',requestId:meta.requestId});}
      },
    };
    this.businessCreations={
      /** Authenticate a creation outcome. Owner claim is separate from current
       * membership, application installation and channel setup. */
      get:async(creationId:string,requestOptions:RequestOptions={}):Promise<Result<PublicBusinessCreation>>=>{
        try{parseBusinessCreationId(creationId);if('idempotencyKey' in requestOptions)throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a valid business creation ID. Reads do not take an idempotency key.');}
        const {body,meta}=await this.#transport.request('getBusinessCreation',{creationId},{},requestOptions),data=this.#creationAnswer(body,false,meta.requestId);
        if(data.id!==creationId)throw new InsideDMProtocolError('InsideDM returned a different client creation.',{code:'invalid_response',requestId:meta.requestId});return {data,meta};
      },
      /** Explicitly replace a pending claim link on the same tenant. A
       * historical retry returns current state rather than reviving an old link. */
      renewClaimLink:async(creationId:string,input:RenewBusinessClaimLinkInput,requestOptions:WriteRequestOptions={}):Promise<Result<BusinessCreationLink>>=>{
        let body:string,idempotencyKey:string;
        try{parseBusinessCreationId(creationId);body=JSON.stringify(parseRenewBusinessClaimLink(JSON.stringify(input)));
          idempotencyKey=requestOptions.idempotencyKey??randomUUID();if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide a valid business creation ID, its current expectedRevision and a valid idempotency key.');}
        try{
          const {body:answer,meta}=await this.#transport.request('renewBusinessClaimLink',{creationId},{},requestOptions,{body,idempotencyKey}),data=this.#creationAnswer(answer,true,meta.requestId);
          if(data.id!==creationId)throw new InsideDMProtocolError('InsideDM returned a different client creation.',{code:'invalid_response',requestId:meta.requestId});return {data,meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'renewBusinessClaimLink',creationId,idempotencyKey});throw error;}
      },
    };
    this.installations={
      /** Current metadata for this application's own installation. */
      get:async(installationId:string,requestOptions:RequestOptions={}):Promise<Result<PublicInstallation>>=>{
        try{parseInstallationId(installationId);if('idempotencyKey' in requestOptions)throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a valid installation ID. Reads do not take an idempotency key.');}
        const {body,meta}=await this.#transport.request('getInstallation',{installationId},{},requestOptions);
        return {data:this.#installationAnswer(body,installationId,meta.requestId),meta};
      },
      /** Revoke one client grant. A recovered old intent returns current state and cannot revoke a fresh approval. */
      revoke:async(installationId:string,input:RevokeInstallationInput,requestOptions:WriteRequestOptions={}):Promise<Result<PublicInstallation>>=>{
        let body:string,idempotencyKey:string;
        try{
          parseInstallationId(installationId);body=JSON.stringify(parseInstallationRevoke(JSON.stringify(input)));
          idempotencyKey=requestOptions.idempotencyKey??randomUUID();if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide the installation ID, current revision, supported reason and a valid idempotency key.');}
        try{
          const {body:answer,meta}=await this.#transport.request('revokeInstallation',{installationId},{},requestOptions,{body,idempotencyKey});
          return {data:this.#installationAnswer(answer,installationId,meta.requestId),meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'revokeInstallation',installationId,idempotencyKey});throw error;}
      },
    };
    this.self={
      /** Verify this server application's identity and effective configuration without selecting a business. */
      get:async(requestOptions:RequestOptions={}):Promise<Result<PublicApplicationSelf>>=>{
        if(!requestOptions||typeof requestOptions!=='object'||Array.isArray(requestOptions)||'idempotencyKey' in requestOptions)throw new InsideDMConfigurationError('Configuration reads require an options object without an idempotency key.');
        const {body,meta}=await this.#transport.request('getApplicationSelf',{},{},requestOptions);
        try{
          const data=parseApplicationSelf((body as {data:unknown}).data);
          if(this.#applicationId!==null&&data.application.id!==this.#applicationId)throw new Error();
          this.#applicationId=data.application.id;return {data,meta};
        }catch{throw new InsideDMProtocolError('InsideDM returned invalid application configuration.',{code:'invalid_response',requestId:meta.requestId});}
      },
    };
    this.installationRequests={
      /** Create a private approval link for a merchant. This grants no business access. */
      create:async(input:CreateInstallationRequestInput,requestOptions:WriteRequestOptions={}):Promise<Result<CreatedInstallationRequest>>=>{
        let body:string,idempotencyKey:string;
        try{
          body=JSON.stringify(parseCreateInstallationRequest(JSON.stringify(input)));
          idempotencyKey=requestOptions.idempotencyKey??randomUUID();
          if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide known business scopes, a registered HTTPS return URL and a valid idempotency key.');}
        try{
          const {body:answer,meta}=await this.#transport.request('createInstallationRequest',{},{},requestOptions,{body,idempotencyKey});
          const data=this.#requestAnswer(answer,true,meta.requestId);return {data,meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'createInstallationRequest',idempotencyKey});throw error;}
      },
      /** Authenticate an application's own outcome. A callback reference is not approval. */
      get:async(requestId:string,requestOptions:RequestOptions={}):Promise<Result<PublicInstallationRequest>>=>{
        try{parseInstallationRequestId(requestId);if('idempotencyKey' in requestOptions)throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a valid installation request ID. Reads do not take an idempotency key.');}
        const {body,meta}=await this.#transport.request('getInstallationRequest',{requestId},{},requestOptions);
        const data=this.#requestAnswer(body,false,meta.requestId);
        if(data.id!==requestId)throw new InsideDMProtocolError('InsideDM returned a different installation request.',{code:'invalid_response',requestId:meta.requestId});
        return {data,meta};
      },
    };
  }
  #onboardingAnswer(body:unknown,created:true,requestId:string):CreatedOnboardingSession;
  #onboardingAnswer(body:unknown,created:false,requestId:string):PublicOnboardingSession;
  #onboardingAnswer(body:unknown,created:boolean,requestId:string):PublicOnboardingSession|CreatedOnboardingSession{
    try{const value=(body as {data:unknown}).data,data=created?parseCreatedOnboardingSession(value):parseOnboardingSession(value);
      if(this.#applicationId!==null&&data.applicationId!==this.#applicationId)throw new Error();this.#applicationId=data.applicationId;return data;
    }catch{throw new InsideDMProtocolError('InsideDM returned invalid provider setup metadata.',{code:'invalid_response',requestId});}
  }
  #businessPage(body:unknown,requestId:string):PartnerBusinessPage{
    try{
      const page=parsePartnerBusinessPage(body);
      if(this.#applicationId!==null&&page.data.some(row=>row.installation.applicationId!==this.#applicationId))throw new Error();
      if(page.data.length)this.#applicationId=page.data[0]!.installation.applicationId;return page;
    }catch{throw new InsideDMProtocolError('InsideDM returned invalid portfolio business metadata.',{code:'invalid_response',requestId});}
  }
  #creationAnswer(body:unknown,link:true,requestId:string):BusinessCreationLink;
  #creationAnswer(body:unknown,link:false,requestId:string):PublicBusinessCreation;
  #creationAnswer(body:unknown,link:boolean,requestId:string):PublicBusinessCreation|BusinessCreationLink{
    try{const value=(body as {data:unknown}).data,data=link?parseBusinessCreationLink(value):parseBusinessCreation(value);
      if(this.#applicationId!==null&&data.applicationId!==this.#applicationId)throw new Error();this.#applicationId=data.applicationId;return data;
    }catch{throw new InsideDMProtocolError('InsideDM returned invalid business creation metadata.',{code:'invalid_response',requestId});}
  }
  #installationAnswer(body:unknown,installationId:string,requestId:string):PublicInstallation{
    try{
      const data=parsePublicInstallation((body as {data:unknown}).data);
      if(data.id!==installationId||this.#applicationId!==null&&data.applicationId!==this.#applicationId)throw new Error();
      this.#applicationId=data.applicationId;return data;
    }catch{throw new InsideDMProtocolError('InsideDM returned invalid installation metadata.',{code:'invalid_response',requestId});}
  }
  #requestAnswer(body:unknown,created:true,requestId:string):CreatedInstallationRequest;
  #requestAnswer(body:unknown,created:false,requestId:string):PublicInstallationRequest;
  #requestAnswer(body:unknown,created:boolean,requestId:string):CreatedInstallationRequest|PublicInstallationRequest{
    try{
      const raw=(body as {data:unknown}).data,data=created?parseCreatedInstallationRequest(raw):parseInstallationRequest(raw);
      if(this.#applicationId!==null&&data.applicationId!==this.#applicationId)throw new Error();
      this.#applicationId=data.applicationId;return data;
    }catch{throw new InsideDMProtocolError('InsideDM returned an invalid installation request.',{code:'invalid_response',requestId});}
  }
  /**
   * Select an approved client from your authenticated server-side mapping; performs no I/O.
   * Returns the same business methods as InsideDM. The SDK acquires/refreshes delegated tokens on use.
   * Selection creates no merchant grant; a fresh approval cannot adopt work from an old installation.
   */
  forBusiness(businessId:string,options:ForBusinessOptions={}):BusinessClient{
    if(typeof businessId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(businessId))throw new InsideDMConfigurationError('businessId: use the saved InsideDM business ID from this client\'s approved connection.', 'businessId');
    if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='scopes'))throw new InsideDMConfigurationError('Business selection accepts only an optional scope subset.');
    const parsed=options.scopes===undefined?null:parseMachinePublicScopes(options.scopes);
    if(parsed!==null&&!Array.isArray(parsed))throw new InsideDMConfigurationError('Provide a nonempty set of known business scopes.');
    const id=businessId.toLowerCase(),scopes=parsed===null?null:Object.freeze([...parsed]),key=`${id}\0${scopes?.join(',')??'*'}`;
    return new DelegatedBusinessClient(new Transport(this.#options,{kind:'delegation',businessId:id,
      get:context=>this.#acquire(key,id,scopes,context),invalidate:token=>{
        const entry=this.#entries.get(key);if(entry?.token?.token===token)entry.token=null;
      }}));
  }
  #entry(key:string):Entry{
    const existing=this.#entries.get(key);
    if(existing){this.#entries.delete(key);this.#entries.set(key,existing);return existing;}
    if(this.#entries.size>=MAX_CACHE_ENTRIES){
      const idle=[...this.#entries].find(([,entry])=>entry.flights.size===0);
      if(!idle)throw new InsideDMTransportError('transport',{code:'delegation_capacity',retryable:true});
      this.#entries.delete(idle[0]);
    }
    const entry:Entry={token:null,flights:new Map()};this.#entries.set(key,entry);return entry;
  }
  async #exchange(businessId:string,scopes:readonly MachinePublicScope[]|null,options:AcquisitionOptions,signal:AbortSignal):Promise<BusinessDelegation>{
    const {body}=await this.#transport.request('createBusinessDelegation',{},{},{signal,timeoutMs:120_000,
      attemptTimeoutMs:options.attemptTimeoutMs,maxRetries:options.maxRetries},{body:JSON.stringify({businessId,...(scopes?{scopes}:{})})});
    let grant:BusinessDelegation;
    try{grant=parseBusinessDelegation((body as {data:unknown}).data);}catch{throw new InsideDMProtocolError('InsideDM returned an invalid business delegation.',{code:'invalid_response'});}
    if(grant.businessId!==businessId||this.#applicationId!==null&&grant.applicationId!==this.#applicationId
      ||scopes&&(grant.scopes.length!==scopes.length||grant.scopes.some(scope=>!scopes.includes(scope)))
      ||Date.parse(grant.expiresAt)<=Date.now()||Date.parse(grant.expiresAt)>Date.now()+15*60_000+REFRESH_SKEW_MS)
      throw new InsideDMProtocolError('InsideDM returned an inconsistent business delegation.',{code:'invalid_response'});
    this.#applicationId=grant.applicationId;return grant;
  }
  async #acquire(key:string,businessId:string,scopes:readonly MachinePublicScope[]|null,options:AcquisitionOptions):Promise<string>{
    if(options.signal?.aborted)throw stopped('aborted');
    const deadline=performance.now()+options.timeoutMs,entry=this.#entry(key);
    if(entry.token&&Date.parse(entry.token.expiresAt)>Date.now()+REFRESH_SKEW_MS)return entry.token.token;
    // Distinct retry policies do not silently borrow another caller's retries.
    const policy=`${options.attemptTimeoutMs}:${options.maxRetries}`;
    let flight=entry.flights.get(policy);
    if(!flight||flight.controller.signal.aborted){
      if(this.#pending>=MAX_PENDING_EXCHANGES)throw new InsideDMTransportError('transport',{code:'delegation_capacity',retryable:true});
      const controller=new AbortController();let created:Flight;this.#pending++;
      const promise=this.#exchange(businessId,scopes,options,controller.signal).then(grant=>{
        const newerEpoch=entry.token?.installationId===grant.installationId&&Number(entry.token.authorityVersion)>Number(grant.authorityVersion);
        if(!controller.signal.aborted&&!newerEpoch)entry.token=grant;return grant;
      }).finally(()=>{created.done=true;this.#pending--;if(entry.flights.get(policy)===created)entry.flights.delete(policy);});
      created={controller,promise,waiters:0,done:false};entry.flights.set(policy,created);flight=created;
    }
    const pending=flight;pending.waiters++;
    return new Promise<string>((resolve,reject)=>{
      let finished=false;
      const finish=(grant:BusinessDelegation|null,error:unknown=null)=>{
        if(finished)return;finished=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);pending.waiters--;
        if(pending.waiters===0&&!pending.done)pending.controller.abort();
        if(error!==null){reject(error);return;}
        if(options.signal?.aborted){reject(stopped('aborted'));return;}
        if(performance.now()>=deadline){reject(stopped('timeout'));return;}
        resolve(grant!.token);
      };
      const abort=()=>finish(null,stopped('aborted'));
      const timer=setTimeout(()=>finish(null,stopped('timeout')),Math.max(1,deadline-performance.now()));
      options.signal?.addEventListener('abort',abort,{once:true});
      pending.promise.then(grant=>finish(grant),error=>finish(null,error));
      if(options.signal?.aborted)abort();
    });
  }
}
