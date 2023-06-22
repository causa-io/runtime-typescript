import 'jest-extended';
import { InvalidClaimRequirementsError } from './errors.js';
import { doesUserSatisfyClaimRequirements } from './user-claims.js';

describe('checkUserClaims', () => {
  it('should return true when the user has all the required basic claims', () => {
    const actualSatisfy = doesUserSatisfyClaimRequirements(
      { id: '123', isAdmin: true, specialValue: '🛂', other: '🤷' },
      { isAdmin: true, specialValue: '🛂' },
    );

    expect(actualSatisfy).toBeTrue();
  });

  it('should return true when the user has all the required claims with containsAny', () => {
    const actualSatisfy = doesUserSatisfyClaimRequirements(
      { id: '123', isAdmin: true, roles: ['👮‍♂️', '🦸'], other: '🤷' },
      { isAdmin: true, roles: { containsAny: ['🦸', '👽'] } },
    );

    expect(actualSatisfy).toBeTrue();
  });

  it('should return false when the user has an incorrect value for a basic claim', () => {
    const actualSatisfy = doesUserSatisfyClaimRequirements(
      { id: '123', isAdmin: false, specialValue: '🛂', other: '🤷' },
      { isAdmin: true, specialValue: '🛂' },
    );

    expect(actualSatisfy).toBeFalse();
  });

  it('should return false when the user does not have the expected value for a claim with containsAny', () => {
    const actualSatisfy = doesUserSatisfyClaimRequirements(
      { id: '123', isAdmin: true, roles: ['👮‍♂️', '🦸'], other: '🤷' },
      { isAdmin: true, roles: { containsAny: ['👽', '👻'] } },
    );

    expect(actualSatisfy).toBeFalse();
  });

  it('should return false when the user is missing a required claim', () => {
    const actualSatisfy = doesUserSatisfyClaimRequirements(
      { id: '123', isAdmin: true, other: '🤷' },
      { isAdmin: true, specialValue: '🛂' },
    );

    expect(actualSatisfy).toBeFalse();
  });

  it('should throw an error when the requirements are invalid', () => {
    expect(() =>
      doesUserSatisfyClaimRequirements({ id: '123' }, { isAdmin: null as any }),
    ).toThrow(InvalidClaimRequirementsError);

    expect(() =>
      doesUserSatisfyClaimRequirements(
        { id: '123', isAdmin: true, other: '🤷' },
        { isAdmin: true, specialValue: { containsAny: '💥' as any } },
      ),
    ).toThrow(InvalidClaimRequirementsError);

    expect(() =>
      doesUserSatisfyClaimRequirements(
        { id: '123', isAdmin: true, other: '🤷' },
        { isAdmin: true, specialValue: { otherCondition: '💥' } as any },
      ),
    ).toThrow(InvalidClaimRequirementsError);
  });
});
