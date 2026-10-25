import type { Language } from './i18n/context'

export type ErrorCode =
  | 'MAINTENANCE'
  | 'COD_DISABLED'
  | 'STORE_UNAVAILABLE'
  | 'INVALID_CUSTOMER'
  | 'INVALID_PHONE'
  | 'INVALID_ITEMS'
  | 'RATE_LIMITED'
  | 'SOLD_OUT'
  | 'NOT_FOUND'
  | 'CANNOT_CANCEL'
  | 'INVALID_STATE'
  | 'INVALID_NOTE'
  | 'RETURN_WINDOW_CLOSED'
  | 'NOT_AUTHENTICATED'
  | 'FORBIDDEN'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'NOTE_REQUIRED'
  | 'PAYMENT_NOT_CONFIRMED'
  | 'ALREADY_RESTOCKED'
  | 'INVALID_AMOUNT'
  | 'REFERENCE_REQUIRED'
  | 'ORDER_NOT_ELIGIBLE'
  | 'ORDER_NOT_FOUND_OR_DUPLICATE'
  | 'NOTHING_TO_SETTLE'
  | 'INVALID_SETTING'
  | 'APPEND_ONLY'

type Message = Record<Language, string>

const messages: Record<ErrorCode, Message> = {
  MAINTENANCE: {
    en: 'The shop is under maintenance. Please check back soon.',
    km: 'ហាងកំពុងថែទាំ។ សូមត្រឡប់មកវិញឆាប់ៗនេះ។',
  },
  COD_DISABLED: {
    en: 'Cash on delivery is currently unavailable.',
    km: 'ការបង់ប្រាក់ពេលទទួលទំនិញមិនអាចប្រើបានទេនៅពេលនេះ។',
  },
  STORE_UNAVAILABLE: {
    en: 'This store is not available right now.',
    km: 'ហាងនេះមិនអាចប្រើបានទេនៅពេលនេះ។',
  },
  INVALID_CUSTOMER: {
    en: 'Please check your name, address, and province.',
    km: 'សូមពិនិត្យឈ្មោះ អាសយដ្ឋាន និងខេត្តរបស់អ្នក។',
  },
  INVALID_PHONE: {
    en: 'Please enter a valid Cambodian phone number.',
    km: 'សូមបញ្ចូលលេខទូរសព្ទកម្ពុជាដែលត្រឹមត្រូវ។',
  },
  INVALID_ITEMS: {
    en: 'Some items in your order are not valid. Please check your cart.',
    km: 'ទំនិញខ្លះក្នុងការបញ្ជាទិញរបស់អ្នកមិនត្រឹមត្រូវ។ សូមពិនិត្យកន្ត្រករបស់អ្នក។',
  },
  RATE_LIMITED: {
    en: 'Too many attempts. Please wait a moment and try again.',
    km: 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច ហើយព្យាយាមម្តងទៀត។',
  },
  SOLD_OUT: {
    en: 'This item is sold out.',
    km: 'ទំនិញនេះអស់ពីស្តុកហើយ។',
  },
  NOT_FOUND: {
    en: 'Not found.',
    km: 'រកមិនឃើញ។',
  },
  CANNOT_CANCEL: {
    en: 'This order can no longer be cancelled.',
    km: 'ការបញ្ជាទិញនេះមិនអាចបោះបង់បានទៀតទេ។',
  },
  INVALID_STATE: {
    en: 'This action is not allowed in the current state.',
    km: 'សកម្មភាពនេះមិនអនុញ្ញាតក្នុងស្ថានភាពបច្ចុប្បន្នទេ។',
  },
  INVALID_NOTE: {
    en: 'Please write a note between 3 and 1000 characters.',
    km: 'សូមសរសេរចំណាំចាប់ពី ៣ ដល់ ១០០០ តួអក្សរ។',
  },
  RETURN_WINDOW_CLOSED: {
    en: 'The reporting window for this order has closed.',
    km: 'រយៈពេលរាយការណ៍បញ្ហាសម្រាប់ការបញ្ជាទិញនេះបានបញ្ចប់ហើយ។',
  },
  NOT_AUTHENTICATED: {
    en: 'Please sign in to continue.',
    km: 'សូមចូលគណនីដើម្បីបន្ត។',
  },
  FORBIDDEN: {
    en: 'You do not have permission to do this.',
    km: 'អ្នកមិនមានសិទ្ធិធ្វើប្រតិបត្តិការនេះទេ។',
  },
  ORDER_NOT_FOUND: {
    en: 'Order not found.',
    km: 'រកមិនឃើញការបញ្ជាទិញ។',
  },
  INVALID_TRANSITION: {
    en: 'This status change is not allowed.',
    km: 'ការផ្លាស់ប្តូរស្ថានភាពនេះមិនអនុញ្ញាតទេ។',
  },
  NOTE_REQUIRED: {
    en: 'A note is required for this action.',
    km: 'ត្រូវការចំណាំសម្រាប់សកម្មភាពនេះ។',
  },
  PAYMENT_NOT_CONFIRMED: {
    en: 'The payment has not been confirmed yet.',
    km: 'ការបង់ប្រាក់មិនទាន់បានបញ្ជាក់នៅឡើយទេ។',
  },
  ALREADY_RESTOCKED: {
    en: 'Stock has already been restored for this order.',
    km: 'ស្តុកត្រូវបានដាក់ត្រឡប់រួចហើយសម្រាប់ការបញ្ជាទិញនេះ។',
  },
  INVALID_AMOUNT: {
    en: 'The amount is not valid.',
    km: 'ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ។',
  },
  REFERENCE_REQUIRED: {
    en: 'A reference is required.',
    km: 'ត្រូវការលេខយោង។',
  },
  ORDER_NOT_ELIGIBLE: {
    en: 'This order is not eligible for settlement.',
    km: 'ការបញ្ជាទិញនេះមិនមានលក្ខណៈសម្បត្តិសម្រាប់ទូទាត់ទេ។',
  },
  ORDER_NOT_FOUND_OR_DUPLICATE: {
    en: 'The order was not found or is already included.',
    km: 'រកមិនឃើញការបញ្ជាទិញ ឬវាត្រូវបានបញ្ចូលរួចហើយ។',
  },
  NOTHING_TO_SETTLE: {
    en: 'There is nothing to settle.',
    km: 'គ្មានអ្វីត្រូវទូទាត់ទេ។',
  },
  INVALID_SETTING: {
    en: 'One of the settings is not valid.',
    km: 'ការកំណត់មួយមិនត្រឹមត្រូវ។',
  },
  APPEND_ONLY: {
    en: 'This record cannot be changed.',
    km: 'កំណត់ត្រានេះមិនអាចកែប្រែបានទេ។',
  },
}

const fallback: Message = {
  en: 'Something went wrong. Please try again.',
  km: 'មានបញ្ហាអ្វីមួយ។ សូមព្យាយាមម្តងទៀត។',
}

export function getErrorMessage(
  code: string | null | undefined,
  language: Language,
): string {
  if (code && code in messages) {
    return messages[code as ErrorCode][language]
  }
  return fallback[language]
}

export function errorCodeFrom(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return null
  }

  const message = (error as { message?: unknown }).message
  if (typeof message !== 'string') return null

  const code = message.split(':')[0]?.trim()
  return code ? code : null
}
