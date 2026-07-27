export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  WorkshopRegistration: { onboardingToken: string; phone: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Voice: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  JobCardDetail: { jobCardId: string };
  NewJobCard: { customerId?: string; vehicleId?: string } | undefined;
  Invoice: { invoiceId: string };
  CustomerDetail: { customerId: string };
  NewCustomer: undefined;
  NewVehicle: { customerId: string };
  Referral: undefined;
  Profile: undefined;
};
