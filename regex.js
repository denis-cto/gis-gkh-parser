/**
 * Created by denisvolkov on 16.06.17.
 */

var text = 'objid_2232';
var r = /\d+/;
console.log('text',text);
k=r.exec(text);
console.log('r',k);
console.log(k[0]);