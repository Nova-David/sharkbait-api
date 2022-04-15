import bcrypt from 'bcrypt';

export const hash = async (password, salt = undefined) => {
  salt = salt ? salt : await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return [hash, salt];
}