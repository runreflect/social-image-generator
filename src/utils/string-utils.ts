/**
 * Split array into chunks of size n.
 */
 export function chunk(arr: any[], chunkSize: number): any[] {
  // See https://stackoverflow.com/questions/8495687/split-array-into-chunks
  if (chunkSize <= 0) throw "Invalid chunk size";
  var R = [];
  for (var i=0,len=arr.length; i<len; i+=chunkSize)
    R.push(arr.slice(i,i+chunkSize));
  return R;
}
