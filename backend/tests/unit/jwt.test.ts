import { signAccessToken, signRefreshToken, verifyToken, generateTokenPair } from '../../src/utils/jwt';

describe('JWT Utils', () => {
  const payload = { userId: 'user-123', role: 'parent' };

  it('should sign and verify access token', () => {
    const token = signAccessToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.role).toBe('parent');
  });

  it('should sign and verify refresh token', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('user-123');
  });

  it('should generate token pair', () => {
    const { accessToken, refreshToken } = generateTokenPair(payload);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(accessToken).not.toBe(refreshToken);
  });

  it('should throw on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });
});
