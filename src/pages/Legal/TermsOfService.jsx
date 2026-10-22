import React from "react";
import { useTranslation } from "../../context/LanguageContext";
import "./Legal.css";

export default function TermsOfService() {
  const { t, language } = useTranslation();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <h1>📜 {language === 'uz' ? "Foydalanish Shartlari" : language === 'ru' ? "Условия использования" : "Terms of Service"}</h1>
      </div>

      <div className="legal-content">
        {language === 'uz' ? (
          <>
            <section className="legal-section">
              <h2>1. Kiritish</h2>
              <p>
                Starsjoy ("Platforma", "Biz", "Shirkati") - bu Telegram mini-applikatsiya orqali 
                Telegram yulduzlarini sotib olish xizmatini taqdim etadi. Ushbu Foydalanish Shartlari 
                ("Shartlar") sizning Platforma va uning xizmatlaridan foydalanishni tartibga soladi.
              </p>
              <p>
                Platformani foydalanish orqali siz ushbu Shartlarni to'liq qabul qilasiz. Agar siz 
                ushbu Shartlarni qabul qilmasangiz, Platformadan foydalanishing mumkin emas.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Xizmat Tavsifi</h2>
              <p>
                Starsjoy foydalanuvchilarga quyidagilarga imkon beradi:
              </p>
              <ul>
                <li>Telegram yulduzlarini sotib olish</li>
                <li>Yulduzlarni boshqa foydalanuvchilarga yuborish</li>
                <li>Referral dasturida ishtirok etish</li>
                <li>Hisob tarixi va statistikasini ko'rish</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Istisno va Mas'uliyat Cheklash</h2>
              <p>
                Platforma "borligi bilan" taqdim etiladi. Biz quyidagilarga kafolat bermiz:
              </p>
              <ul>
                <li>Platforma xizmatining uzluksizligi yoki xatosizligi</li>
                <li>Yulduzlar yoki ma'lumotlarning saqlanishi</li>
                <li>Uchinchi tomon xizmatlarining faoliyati</li>
              </ul>
              <p>
                Biz Platformadan foydalanish natijasida keltirilgan to'g'ri va bilvosita 
                zararlardan mas'ul emasmiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Foydalanuvchi Mas'uliyligi</h2>
              <p>Siz quyidagilarga rozi borsiz:</p>
              <ul>
                <li>Platformani qonuniy maqsadlarda foydalanish</li>
                <li>Bashqa foydalanuvchilarning huquqlarini buzmaslik</li>
                <li>Shaxsiy ma'lumotlarining to'g'riligi</li>
                <li>Hisob xavfsizligi uchun javobgarlik</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. To'lovlar va Qaytarma</h2>
              <p>
                Barcha to'lovlar HUMO va Payme orqali amalga oshiriladi. To'lovlar bekor qilinmaydi 
                va qaytarilmaydi. Yulduzlar darhol hisabingizga o'tkaziladi.
              </p>
              <p>
                Notekis operatsiyalar uchun biz to'liq javobgarlik olmiz va Telegram bilan 
                bog'lanamiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Xizmatni Bekor Qilish</h2>
              <p>
                Biz Platformani istalgan vaqt, oldindan ogohlantirmasdan bekor qilish huquqiga egamiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. O'zgartirishlar</h2>
              <p>
                Ushbu Shartlarni istalgan vaqt o'zgartirishimiz mumkin. O'zgartirishlar e'lon qilingan 
                paytdan kuchga kiradi. Davomiy foydalanish o'zgartirishlarni qabul deb hisoblanadi.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Murojaat</h2>
              <p>
                Savollar yoki muammolar uchun bizning qo'llab-quvvatlash xizmati bilan bog'laning: 
                <a href="https://t.me/StarsjoySupport" target="_blank" rel="noopener noreferrer">
                  @StarsjoySupport
                </a>
              </p>
            </section>

            <section className="legal-section legal-last">
              <p className="legal-updated">
                Oxirgi yangilangan: {new Date().toLocaleDateString('uz-UZ')}
              </p>
            </section>
          </>
        ) : language === 'ru' ? (
          <>
            <section className="legal-section">
              <h2>1. Введение</h2>
              <p>
                Starsjoy («Платформа», «Мы», «Компания») - это сервис покупки звезд Telegram 
                через мини-приложение Telegram. Эти Условия использования («Условия») регулируют 
                ваше использование Платформы и ее услуг.
              </p>
              <p>
                Используя Платформу, вы полностью принимаете эти Условия. Если вы не принимаете 
                эти Условия, вы не можете использовать Платформу.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Описание услуги</h2>
              <p>
                Starsjoy позволяет пользователям:
              </p>
              <ul>
                <li>Покупать звезды Telegram</li>
                <li>Отправлять звезды другим пользователям</li>
                <li>Участвовать в реферальной программе</li>
                <li>Просматривать историю и статистику счета</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Отказ от ответственности и ограничение ответственности</h2>
              <p>
                Платформа предоставляется «как есть». Мы не гарантируем:
              </p>
              <ul>
                <li>Непрерывность или отсутствие ошибок услуги</li>
                <li>Сохранение звезд или данных</li>
                <li>Работоспособность сторонних сервисов</li>
              </ul>
              <p>
                Мы не несем ответственность за прямые и косвенные убытки, полученные в результате 
                использования Платформы.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Ответственность пользователя</h2>
              <p>Вы соглашаетесь:</p>
              <ul>
                <li>Использовать Платформу в законных целях</li>
                <li>Не нарушать права других пользователей</li>
                <li>Отвечать за точность личной информации</li>
                <li>Нести ответственность за безопасность своего аккаунта</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Платежи и возвраты</h2>
              <p>
                Все платежи осуществляются через HUMO и Payme. Платежи не отменяются и не возвращаются. 
                Звезды переводятся на ваш счет немедленно.
              </p>
              <p>
                За ошибочные операции мы несем полную ответственность и свяжемся с Telegram.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Прекращение услуги</h2>
              <p>
                Мы имеем право прекратить Платформу в любое время без предварительного уведомления.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Изменения</h2>
              <p>
                Мы можем изменять эти Условия в любое время. Изменения вступают в силу с момента их 
                объявления. Продолжение использования считается принятием изменений.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Контакты</h2>
              <p>
                По вопросам обратитесь в нашу службу поддержки: 
                <a href="https://t.me/StarsjoySupport" target="_blank" rel="noopener noreferrer">
                  @StarsjoySupport
                </a>
              </p>
            </section>

            <section className="legal-section legal-last">
              <p className="legal-updated">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="legal-section">
              <h2>1. Introduction</h2>
              <p>
                Starsjoy ("Platform", "We", "Company") is a service for purchasing Telegram Stars 
                through a Telegram mini app. These Terms of Service ("Terms") govern your use of the 
                Platform and its services.
              </p>
              <p>
                By using the Platform, you fully accept these Terms. If you do not accept these Terms, 
                you cannot use the Platform.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Service Description</h2>
              <p>
                Starsjoy allows users to:
              </p>
              <ul>
                <li>Purchase Telegram Stars</li>
                <li>Send Stars to other users</li>
                <li>Participate in the referral program</li>
                <li>View account history and statistics</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Disclaimer and Limitation of Liability</h2>
              <p>
                The Platform is provided "as is". We make no guarantees:
              </p>
              <ul>
                <li>Of continuous or error-free service</li>
                <li>Of preservation of Stars or data</li>
                <li>Of third-party service functionality</li>
              </ul>
              <p>
                We are not liable for direct or indirect damages resulting from use of the Platform.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. User Responsibility</h2>
              <p>You agree to:</p>
              <ul>
                <li>Use the Platform for legal purposes only</li>
                <li>Not violate the rights of other users</li>
                <li>Take responsibility for accuracy of personal information</li>
                <li>Be responsible for account security</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Payments and Refunds</h2>
              <p>
                All payments are made through HUMO and Payme. Payments are non-refundable and non-cancellable. 
                Stars are credited to your account immediately.
              </p>
              <p>
                We accept full responsibility for erroneous transactions and will contact Telegram.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Service Termination</h2>
              <p>
                We have the right to terminate the Platform at any time without prior notice.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Modifications</h2>
              <p>
                We may modify these Terms at any time. Changes take effect upon announcement. 
                Continued use constitutes acceptance of changes.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Contact</h2>
              <p>
                For questions, contact our support team: 
                <a href="https://t.me/StarsjoySupport" target="_blank" rel="noopener noreferrer">
                  @StarsjoySupport
                </a>
              </p>
            </section>

            <section className="legal-section legal-last">
              <p className="legal-updated">
                Last updated: {new Date().toLocaleDateString('en-US')}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
