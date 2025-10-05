export interface User {
  uuid: string;
  email: string;
  userPss: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
  createdAt: Date;
  tags?: Tag[];
}

export interface CreateUserData {
  email: string;
  userPss: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
  tagIds?: number[];
}

export interface UpdateUserData {
  name?: string;
  surname?: string;
  email?: string;
  birthdate?: Date;
  zipCode?: string;
  tagIds?: number[];
}

export interface UserProfile {
  uuid: string;
  email: string;
  name: string;
  surname: string;
  birthdate: Date;
  zipCode: string;
  createdAt: Date;
  tags?: Tag[];
}

export interface RefreshToken {
  id: string;
  userUuid: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

export interface Tag {
  tagId: number;
  tagName: string;
  tagType: string;
}

export interface UserTag {
  userUuid: string;
  tagId: number;
  user?: User;
  tag?: Tag;
}

export interface ReqHistory {
  reqId: number;
  inputParams: string;
  outParams: string;
  createdAt: Date;
  rating?: number;
  tags?: Tag[];
}

export interface ReqTag {
  reqId: number;
  tagId: number;
  reqHistory?: ReqHistory;
  tag?: Tag;
}
