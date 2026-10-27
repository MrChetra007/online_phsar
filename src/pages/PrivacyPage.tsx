import { Link } from 'react-router-dom'
import { ArrowRightIcon, ShieldCheckIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

export function PrivacyPage() {
  const { language } = useI18n()
  const isKhmer = language === 'km'

  return (
    <section className="mx-auto max-w-4xl py-4 sm:py-8">
      {/* Breadcrumb Navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowRightIcon className="size-4 rotate-180" />
        {isKhmer ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to home'}
      </Link>

      {/* Header */}
      <div className="mt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
          <ShieldCheckIcon className="size-4 text-emerald-700" />
          <span>{isKhmer ? 'ការការពារទិន្នន័យ' : 'Data Protection'}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {isKhmer ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isKhmer
            ? 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ២៧ ខែ តុលា ឆ្នាំ ២០២៦'
            : 'Last updated: October 27, 2026'}
        </p>
      </div>

      {/* Main Content */}
      <div className="mt-8 space-y-6">
        {/* Section 1: Overview */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '១. សេចក្តីផ្តើម' : '1. Overview'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'សូមស្វាគមន៍មកកាន់ onlinePhsar (ផ្សារអនឡាញ)។ យើងខ្ញុំផ្តល់តម្លៃខ្ពស់ចំពោះការការពារឯកជនភាព និងសុវត្ថិភាពទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកប្រើប្រាស់ទាំងអស់ រួមទាំងអ្នកទិញ និងម្ចាស់ហាងក្នុងស្រុក។ គោលការណ៍ឯកជនភាពនេះពន្យល់ពីរបៀបដែលយើងខ្ញុំប្រមូល ប្រើប្រាស់ និងការពារព័ត៌មានរបស់អ្នក ស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។'
              : 'Welcome to onlinePhsar ("we", "our", or "the Platform"). We value the privacy of our customers and local merchant partners. This Privacy Policy outlines how we collect, use, and protect your personal information when you browse our marketplace, place orders, or operate a store, in accordance with applicable laws in the Kingdom of Cambodia.'}
          </p>
        </div>

        {/* Section 2: Data We Collect */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '២. ព័ត៌មានដែលយើងខ្ញុំប្រមូល' : '2. Information We Collect'}
          </h2>
          <div className="mt-4 space-y-4 text-slate-600">
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="font-semibold text-slate-900">
                {isKhmer ? 'ក. ព័ត៌មានអ្នកទិញ' : 'A. Customer & Order Details'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                {isKhmer
                  ? 'នៅពេលអ្នកធ្វើការបញ្ជាទិញ យើងខ្ញុំប្រមូល៖ ឈ្មោះពេញ លេខទូរសព្ទកម្ពុជា អាសយដ្ឋានដឹកជញ្ជូន ខេត្ត/រាជធានី និងទំនិញដែលបានជ្រើសរើស។ ព័ត៌មានទាំងនេះគឺចាំបាច់ដើម្បីរៀបចំការដឹកជញ្ជូន។'
                  : 'When placing an order, we collect your full name, Cambodian phone number, delivery address, province, and ordered items. This information is necessary to prepare and deliver your items.'}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="font-semibold text-slate-900">
                {isKhmer ? 'ខ. ព័ត៌មានម្ចាស់ហាង' : 'B. Merchant & Store Owners'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                {isKhmer
                  ? 'សម្រាប់ម្ចាស់ហាង យើងខ្ញុំប្រមូល៖ ឈ្មោះហាង ព័ត៌មានទំនាក់ទំនង គណនី Telegram សម្រាប់ទទួលការជូនដំណឹងពីការបញ្ជាទិញ និងព័ត៌មានគណនីធនាគារសម្រាប់ការទូទាត់ប្រាក់ចំណូល។'
                  : 'For store owners, we collect store names, merchant contact details, Telegram handles/chat IDs for instant order dispatch notifications, and settlement account details.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Payments & KHQR */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៣. សុវត្ថិភាពការទូទាត់ KHQR' : '3. Payment & KHQR Security'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'ការទូទាត់តាមប្រព័ន្ធឌីជីថលនៅលើ onlinePhsar ត្រូវបានដំណើរការតាមរយៈប្រព័ន្ធស្ដង់ដារ KHQR របស់ធនាគារជាតិនៃកម្ពុជា (Bakong)។'
              : 'Digital payments on onlinePhsar are processed through the official National Bank of Cambodia KHQR (Bakong) standard.'}
          </p>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950">
            <p className="font-semibold">
              {isKhmer ? 'គ្មានការរក្សាទុកលេខកាត ឬលេខសម្ងាត់' : 'Zero Sensitive Card Storage'}
            </p>
            <p className="mt-1 leading-relaxed text-emerald-900">
              {isKhmer
                ? 'យើងខ្ញុំមិនដែលស្នើសុំ ឬរក្សាទុកលេខកាតឥណទាន ឬលេខសម្ងាត់ធនាគាររបស់អ្នកឡើយ។ រាល់ប្រតិបត្តិការ KHQR ត្រូវបានផ្ទៀងផ្ទាត់ដោយផ្ទាល់តាមរយៈកម្មវិធីធនាគារផ្លូវការរបស់អ្នក។'
                : 'We never request, handle, or store credit card numbers or banking PINs. KHQR transactions are verified securely and cryptographically via your banking app.'}
            </p>
          </div>
        </div>

        {/* Section 4: Data Sharing */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៤. ការចែករំលែកព័ត៌មាន' : '4. How Information is Shared'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'យើងខ្ញុំមិនលក់ ឬជួលព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកទៅកាន់ភាគីទីបីឡើយ។ ព័ត៌មានរបស់អ្នកត្រូវបានចែករំលែកតែក្នុងករណីចាំបាច់ប៉ុណ្ណោះ៖'
              : 'We do not sell, rent, or trade your personal information. Information is only shared strictly as required to fulfill service:'}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>
              <strong className="text-slate-800">
                {isKhmer ? 'ជាមួយហាងដែលបំពេញការបញ្ជាទិញ៖' : 'With Fulfilling Merchants: '}
              </strong>
              {isKhmer
                ? ' ហាងទទួលបានឈ្មោះ លេខទូរសព្ទ និងអាសយដ្ឋាន ដើម្បីរៀបចំវេចខ្ចប់ទំនិញ។'
                : ' The specific store fulfilling your order receives the customer name, phone number, and address to pack and fulfill the purchase.'}
            </li>
            <li>
              <strong className="text-slate-800">
                {isKhmer ? 'ជាមួយអ្នកដឹកជញ្ជូនក្នុងស្រុក៖' : 'With Courier Services: '}
              </strong>
              {isKhmer
                ? ' ព័ត៌មានអាសយដ្ឋាន និងលេខទូរសព្ទត្រូវបានផ្តល់ជូនអ្នកដឹកជញ្ជូន ដើម្បីទាក់ទងពេលទំនិញទៅដល់។'
                : ' Couriers receive shipping details and contact phone numbers solely to contact you during delivery.'}
            </li>
            <li>
              <strong className="text-slate-800">
                {isKhmer ? 'ការជូនដំណឹងតាម Telegram៖' : 'Telegram Notifications: '}
              </strong>
              {isKhmer
                ? ' ប្រព័ន្ធផ្ញើព័ត៌មានសង្ខេបនៃការបញ្ជាទិញទៅកាន់ Telegram របស់ម្ចាស់ហាង ដើម្បីរៀបចំទំនិញទាន់ពេលវេលា។'
                : ' Secure webhook notifications dispatch order codes and item summaries to merchant Telegram bots for fast order dispatch.'}
            </li>
          </ul>
        </div>

        {/* Section 5: Data Rights & Contact */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៥. សិទ្ធិ និងទំនាក់ទំនង' : '5. Your Rights & Inquiries'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'អ្នកមានសិទ្ធិស្នើសុំពិនិត្យ កែតម្រូវ ឬស្នើសុំលុបទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកចេញពីប្រព័ន្ធ។ ប្រសិនបើអ្នកមានសំណួរអំពីគោលការណ៍ឯកជនភាពនេះ សូមទាក់ទងមកកាន់ក្រុមការងាររបស់យើងខ្ញុំ។'
              : 'You have the right to inspect, update, or request the deletion of your personal contact records. If you have any inquiries regarding data protection on onlinePhsar, please contact our support team.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/track"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {isKhmer ? 'តាមដានការបញ្ជាទិញ' : 'Track an Order'}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50"
            >
              {isKhmer ? 'ត្រឡប់ទៅទិញទំនិញ' : 'Browse Marketplace'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
