export function encode(value) {
  try {
    return Buffer.from(JSON.stringify(value)).toString('base64').replace('+', '-').replace('/', '_');
  } catch (e) {
    return '';
  }
}


export function decode(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8').replace('-', '+').replace('_', '/'));
  } catch (e) {
    return null;
  }
}

