export interface AuthResult {
  token: string;
  expiresAtUtc: string;
  fullName: string;
  email: string;
  department: string;
  roles: string[];
}

export interface DestructionRecordDto {
  serialNo: number;
  recordsTitle?: string | null;
  originalOrCopy?: string | null;
  recordsType?: string | null;
  storageMedium?: string | null;
  retentionRuleNo?: string | null;
  firstDate?: string | null;
  lastDate?: string | null;
  recordsVolume?: number | null;
  remarks?: string | null;
}

export interface SignatureBlockDto {
  name?: string | null;
  date?: string | null;
  signature?: string | null;
  stamp?: string | null;
}

export interface SaveDestructionRequestDto {
  concernedParty: string;
  destructionNo: string;
  department: string;
  responsibleOfficer: string;
  email: string;
  phone: string;
  storageLocation: string;
  totalVolume?: number | null;
  recordsFirstDate?: string | null;
  recordsLastDate?: string | null;
  creatorUnit?: SignatureBlockDto | null;
  legalAffairs?: SignatureBlockDto | null;
  internalAudit?: SignatureBlockDto | null;
  recordsManagement?: SignatureBlockDto | null;
  saveAsDraft?: boolean;
  records: DestructionRecordDto[];
}

export interface RequestListItem {
  id: number;
  destructionNo?: string | null;
  department: string;
  responsibleOfficer: string;
  status: string;
  submittedAt: string;
  recordsCount: number;
  adminNotes?: string | null;
}

export interface RequestDetails extends SaveDestructionRequestDto {
  id: number;
  status: string;
  adminNotes?: string | null;
  submittedAt: string;
}

export interface Dashboard {
  totalSubmissions: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  draftCount: number;
  recentSubmissions: RequestListItem[];
}

export interface UnitNode {
  id: number;
  name: string;
  parentId?: number | null;
  children: UnitNode[];
}

export interface DepartmentNode {
  id: number;
  name: string;
  units: UnitNode[];
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  department: string;
  isActive: boolean;
  registrationStatus: string;
  roles: string[];
}
