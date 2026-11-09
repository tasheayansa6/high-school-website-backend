import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AssignStudentFeeBody,
  CreateFeeStructureBody,
  FeeStructure,
  FeeStructureListQuery,
  OpsPaginated,
  PaymentList,
  RecordPaymentBody,
  RecordPaymentResult,
  StudentFee,
  StudentFeeListQuery,
  UpdateFeeStructureBody,
  UpdateStudentFeeBody,
} from '@/types/ops.types';

const structures = endpoints.admin.sms.fees;
const studentFees = endpoints.admin.sms.studentFees;

export function listFeeStructures(query: FeeStructureListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<FeeStructure>>(structures.list, { ...config, params: query });
}

export function createFeeStructure(body: CreateFeeStructureBody, config?: ApiRequestConfig) {
  return api.post<{ feeStructure: FeeStructure }>(structures.list, body, config);
}

export function updateFeeStructure(
  id: number,
  body: UpdateFeeStructureBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ feeStructure: FeeStructure }>(structures.detail(id), body, config);
}

export function deleteFeeStructure(id: number, config?: ApiRequestConfig) {
  return api.delete<{ feeStructure: FeeStructure }>(structures.detail(id), config);
}

export function listStudentFees(query: StudentFeeListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<StudentFee>>(studentFees.list, { ...config, params: query });
}

export function assignStudentFee(body: AssignStudentFeeBody, config?: ApiRequestConfig) {
  return api.post<{ studentFee: StudentFee }>(studentFees.list, body, config);
}

export function updateStudentFee(
  id: number,
  body: UpdateStudentFeeBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ studentFee: StudentFee }>(studentFees.detail(id), body, config);
}

export function deleteStudentFee(id: number, config?: ApiRequestConfig) {
  return api.delete<{ studentFee: StudentFee }>(studentFees.detail(id), config);
}

export function listPayments(id: number, config?: ApiRequestConfig) {
  return api.get<PaymentList>(studentFees.payments(id), config);
}

export function recordPayment(id: number, body: RecordPaymentBody, config?: ApiRequestConfig) {
  return api.post<RecordPaymentResult>(studentFees.payments(id), body, config);
}

export function deletePayment(id: number, paymentId: number, config?: ApiRequestConfig) {
  return api.delete(studentFees.payment(id, paymentId), config);
}
