export interface User {
  uuid: string;
  email: string;
  userPss: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  userPss: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
}

export interface UpdateUserData {
  name?: string;
  surname?: string;
  email?: string;
  birthdate?: Date;
  zipCode?: string;
}

export interface UserProfile {
  uuid: string;
  email: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  userUuid: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}
