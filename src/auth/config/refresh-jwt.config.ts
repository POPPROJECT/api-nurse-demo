import { registerAs } from '@nestjs/config';

export default registerAs('refreshJwt', () => ({
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_REFRESH_EXPIRE_IN,
}));