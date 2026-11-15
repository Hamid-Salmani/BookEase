namespace BookEase.Domain.Enums;

public enum UserRole { Customer = 0, Admin = 1, Staff = 2 }

public enum BookingStatus { Pending = 0, Confirmed = 1, Cancelled = 2, Completed = 3, NoShow = 4 }

public enum PaymentStatus { Pending = 0, Succeeded = 1, Failed = 2, Refunded = 3 }

public enum EmailStatus { Pending = 0, Sent = 1, Failed = 2 }
