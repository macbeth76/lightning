/**
 * Sample test file to validate static analysis
 */

// This method is exactly 24 lines (should pass)
function validMethod(): void {
  const x = 1;
  const y = 2;
  const z = x + y;
  console.log(z);
  if (z > 0) {
    console.log('positive');
  }
  const a = [1, 2, 3];
  a.forEach((item) => {
    console.log(item);
  });
  const obj = { key: 'value' };
  console.log(obj);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = z * 2;
  console.log(result);
  return;
}
function tooLongMethod(): void {
  const x = 1;
  const y = 2;
  const z = x + y;
  console.log(z);
  const a = [1, 2, 3];
  a.forEach((item) => {
    console.log(item);
  });
  const obj = { key: 'value' };
  console.log(obj);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = z * 2;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const extra = result + 1;
  console.log(extra);
  const b = x + 1;
  const c = b + 1;
  const d = c + 1;
  const e = d + 1;
  const f = e + 1;
  const g = f + 1;
  const h = g + 1;
  const i = h + 1;
  console.log(i);
  return;
}

// Short method (should pass)
function shortMethod(): void {
  console.log('hello');
}
