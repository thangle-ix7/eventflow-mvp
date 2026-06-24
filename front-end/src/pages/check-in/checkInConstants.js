export const EMPTY_ATTENDEE = {
  fullName: '',
  email: '',
  phone: '',
  attendeeType: 'GUEST',
  status: 'INVITED',
  note: '',
};

export const EMPTY_SESSION = {
  name: '',
  location: '',
  startsAt: '',
  endsAt: '',
  active: true,
};

export const STATUS_LABELS = {
  INVITED: 'Đã mời',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã check-in',
  NO_SHOW: 'Vắng mặt',
};

export const TYPE_LABELS = {
  GUEST: 'Khách mời',
  VIP: 'VIP',
  SPEAKER: 'Diễn giả',
  SPONSOR: 'Nhà tài trợ',
  STAFF: 'Nhân sự',
};
