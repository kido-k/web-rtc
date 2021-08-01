export function getUniqueId(number) {
  const characters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let _number = 16
  if (number) _number = number
  return Array.from(Array(_number))
    .map(() => characters[Math.floor(Math.random() * characters.length)])
    .join('')
}
