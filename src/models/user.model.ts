export interface IUser {
  readonly _id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly passwordHash: string;
}