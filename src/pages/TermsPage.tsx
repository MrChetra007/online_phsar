import { Link } from 'react-router-dom'
import { ArrowRightIcon, StoreIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

export function TermsPage() {
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
          <StoreIcon className="size-4 text-emerald-700" />
          <span>{isKhmer ? 'លក្ខខណ្ឌផ្លូវការ' : 'Official Agreement'}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {isKhmer ? 'លក្ខខណ្ឌប្រើប្រាស់' : 'Terms of Service'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isKhmer
            ? 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ២៧ ខែ តុលា ឆ្នាំ ២០២៦'
            : 'Last updated: October 27, 2026'}
        </p>
      </div>

      {/* Main Content */}
      <div className="mt-8 space-y-6">
        {/* Section 1: Marketplace Model */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '១. គំរូអាជីវកម្មទីផ្សារ' : '1. Marketplace Model'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'onlinePhsar គឺជាវេទិកាផ្សារអនឡាញដែលតភ្ជាប់អ្នកទិញ ជាមួយនឹងហាងក្នុងស្រុកឯករាជ្យនៅទូទាំងប្រទេសកម្ពុជា។ ហាងនីមួយៗនៅលើប្រព័ន្ធដំណើរការអាជីវកម្មដោយឯករាជ្យ និងទទួលខុសត្រូវចំពោះគុណភាពទំនិញ ការកំណត់តម្លៃ និងការវេចខ្ចប់។'
              : 'onlinePhsar is an e-commerce platform that connects buyers with independent local merchants across Cambodia. Each store on the platform operates independently and retains responsibility for their product quality, pricing, inventory, and order fulfillment.'}
          </p>
        </div>

        {/* Section 2: Orders & Pricing */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '២. ការបញ្ជាទិញ និងតម្លៃទំនិញ' : '2. Orders & Pricing'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'រាល់តម្លៃដែលបង្ហាញនៅលើប្រព័ន្ធត្រូវបានកំណត់ដោយម្ចាស់ហាងផ្ទាល់។ នៅពេលអ្នកទិញបញ្ជាទិញ ព័ត៌មានលម្អិតរួមទាំងតម្លៃសរុប និងថ្លៃដឹកជញ្ជូនប៉ាន់ស្មានតាមខេត្ត នឹងត្រូវបានបង្ហាញយ៉ាងច្បាស់លាស់មុនពេលបញ្ជាក់ការទិញ។'
              : 'All product prices listed on onlinePhsar are set directly by individual merchants. When an order is placed, an itemized summary—including product subtotal and province-based delivery estimates—is presented before payment confirmation.'}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>
              {isKhmer
                ? 'ទំនិញអាស្រ័យលើចំនួនដែលមានក្នុងស្តុកជាក់ស្តែងរបស់ហាង។'
                : 'Orders are subject to physical stock availability confirmed by the fulfilling merchant.'}
            </li>
            <li>
              {isKhmer
                ? 'ក្នុងករណីទំនិញអស់ពីស្តុក ហាងអាចធ្វើការលុបចោល ឬទាក់ទងអ្នកទិញដើម្បីប្តូរទំនិញស្រដៀងគ្នា។'
                : 'If an item is sold out, merchants reserve the right to decline or notify the buyer for an agreed replacement or refund.'}
            </li>
          </ul>
        </div>

        {/* Section 3: Payments & KHQR */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៣. វិធីទូទាត់ប្រាក់' : '3. Payment Terms'}
          </h2>
          <div className="mt-4 space-y-3 text-slate-600">
            <div className="rounded-2xl border border-stone-200/60 bg-stone-50 p-4">
              <h3 className="font-semibold text-slate-900">
                {isKhmer ? 'ក. ការទូទាត់ KHQR' : 'A. KHQR Instant Digital Payments'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                {isKhmer
                  ? 'ការទូទាត់តាមប្រព័ន្ធ KHQR មានសុពលភាពរយៈពេល ១០ នាទី សម្រាប់ការស្កេនដោយកម្មវិធីធនាគារនានាក្នុងប្រទេសកម្ពុជា។ ការបញ្ជាទិញនឹងត្រូវបានបញ្ជាក់ភ្លាមៗបន្ទាប់ពីប្រព័ន្ធធនាគារផ្ទៀងផ្ទាត់ជោគជ័យ។'
                  : 'KHQR codes generated at checkout remain active for 10 minutes. Orders are automatically marked as paid upon verified bank transfer via the Bakong network.'}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200/60 bg-stone-50 p-4">
              <h3 className="font-semibold text-slate-900">
                {isKhmer ? 'ខ. ការបង់ប្រាក់ពេលទទួលទំនិញ (COD)' : 'B. Cash on Delivery (COD)'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                {isKhmer
                  ? 'សម្រាប់ហាងដែលគាំទ្រសេវា COD អ្នកទិញត្រូវបង់ប្រាក់គ្រប់ចំនួនជូនអ្នកដឹកជញ្ជូននៅពេលទំនិញមកដល់។'
                  : 'For eligible stores offering Cash on Delivery, the recipient agrees to pay the courier the exact total amount in cash upon delivery.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Delivery & Logistics */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៤. ការដឹកជញ្ជូន និងអ្នកនាំសំបុត្រ' : '4. Shipping & Delivery'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'ការដឹកជញ្ជូនត្រូវបានសម្របសម្រួលដោយម្ចាស់ហាង ដោយប្រើប្រាស់សេវាដឹកជញ្ជូនក្នុងស្រុក។ រយៈពេលនៃការដឹកជញ្ជូនអាចប្រែប្រួលអាស្រ័យលើទីតាំងខេត្ត និងលក្ខខណ្ឌអាកាសធាតុ។ អ្នកទិញអាចប្រើប្រាស់លេខកូដបញ្ជាទិញ ដើម្បីតាមដានស្ថានភាពទំនិញបានគ្រប់ពេលវេលា។'
              : 'Deliveries are fulfilled through trusted local courier services arranged by merchants. Delivery timeframes vary based on destination provinces and courier schedules. Customers can track their order status anytime using their unique Order Code and phone number.'}
          </p>
        </div>

        {/* Section 5: Merchant Rules & Prohibited Items */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៥. វិន័យហាង និងទំនិញហាមឃាត់' : '5. Prohibited Items & Merchant Conduct'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'ម្ចាស់ហាងទាំងអស់ត្រូវគោរពច្បាប់ពាណិជ្ជកម្មកម្ពុជា។ ហាមដាច់ខាតនូវការដាក់លក់ទំនិញក្លែងក្លាយ ទំនិញខុសច្បាប់ អាវុធ គ្រឿងញៀន ឬសារធាតុគ្រោះថ្នាក់។ onlinePhsar រក្សាសិទ្ធិក្នុងការបិទហាងណាដែលល្មើសនឹងគោលការណ៍ទាំងនេះដោយគ្មានការជូនដំណឹងជាមុន។'
              : 'Merchants must comply with Cambodian commercial and consumer laws. Counterfeit goods, illegal contraband, firearms, drugs, or hazardous substances are strictly prohibited. onlinePhsar reserves the right to suspend any store violating these standards without prior notice.'}
          </p>
        </div>

        {/* Section 6: Governing Law */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {isKhmer ? '៦. ច្បាប់គ្រប់គ្រង' : '6. Governing Law'}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {isKhmer
              ? 'លក្ខខណ្ឌប្រើប្រាស់នេះត្រូវបានគ្រប់គ្រង និងបកស្រាយស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។ រាល់វិវាទដែលកើតឡើងនឹងត្រូវដោះស្រាយដោយសន្តិវិធី ឬតាមរយៈយន្តការតុលាការមានសមត្ថកិច្ចនៅកម្ពុជា។'
              : 'These Terms of Service are governed by and construed in accordance with the laws of the Kingdom of Cambodia. Any dispute arising under these terms shall be resolved through good-faith mediation or competent courts in Cambodia.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {isKhmer ? 'អានគោលការណ៍ឯកជនភាព' : 'View Privacy Policy'}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50"
            >
              {isKhmer ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to Marketplace'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
