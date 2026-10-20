import ts from 'typescript';

/** Module syntax only: API fields named "from" are ordinary data. Escaped
 * string literals are decoded by the parser; computed loaders stay explicit. */
export function moduleSpecifiers(text,fileName){
  const source=ts.createSourceFile(fileName,text,ts.ScriptTarget.Latest,true,fileName.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
  const found=[];
  const add=node=>found.push(node&&ts.isStringLiteralLike(node)?node.text:null);
  const visit=node=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)add(node.moduleSpecifier);
    else if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument))add(node.argument.literal);
    else if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference))add(node.moduleReference.expression);
    else if(ts.isCallExpression(node)){
      const expression=node.expression;
      const requireCall=ts.isIdentifier(expression)&&expression.text==='require'
        ||ts.isPropertyAccessExpression(expression)&&ts.isIdentifier(expression.expression)
          &&(expression.expression.text==='module'&&expression.name.text==='require'||expression.expression.text==='require'&&expression.name.text==='resolve');
      if(expression.kind===ts.SyntaxKind.ImportKeyword||requireCall)add(node.arguments[0]);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);return found;
}
