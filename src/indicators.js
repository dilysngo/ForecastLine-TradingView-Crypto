function calculateEMA(mArray, mRange) {
  var k = 2 / (mRange + 1);
  // first item is just the same as the first item in the input
  let emaArray = [mArray[0]];
  // for the rest of the items, they are computed with the previous one
  for (var i = 1; i < mArray.length; i++) {
    emaArray.push(mArray[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
}

export const ema_inc = (data, mRange) => {
  const d1 = data.map((d) => d.close);
  const d3 = calculateEMA(d1, mRange);
  data = data.map((d, i) => ({...d, ema: d3[i]}));
  return data;
};
