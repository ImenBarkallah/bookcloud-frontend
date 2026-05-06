export interface CreateStaffAssignmentRequestDto {
  userUid: string;
  branchId?: string | null;
  staffRole: string;
  active?: boolean;
}

