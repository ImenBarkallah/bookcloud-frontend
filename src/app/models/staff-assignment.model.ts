/** Mirrors backend `com.bookcloud.smartlibrary.model.StaffAssignment`. */
export interface StaffAssignment {
  id: string;
  userUid: string;
  branchId: string | null;
  staffRole: string | null;
  active: boolean;
  createdAt: string | null;
}

