import React from "react";
import { useTranslation } from "../../context/LanguageContext";
import "./Legal.css";

export default function PrivacyPolicy() {
  const { t, language } = useTranslation();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <h1>🔒 {language === 'uz' ? "Maxfiylik Siyosati" : language === 'ru' ? "Политика конфиденциальности" : "Privacy Policy"}</h1>
      </div>

      <div className="legal-content">
        {language === 'uz' ? (
          <>
            <section className="legal-section">
              <h2>1. Kirish</h2>
              <p>
                Starsjoy ("Biz", "Shirkati") foydalanuvchilarning maxfiyligini jiddiy oladi. 
                Ushbu Maxfiylik Siyosati sizning ma'lumotlarimiz qanday to'planadi, ishlatiladi 
                va himoyalanaganligini tushuntiradi.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Biz Qanday Ma'lumotlarni To'playmiz?</h2>
              <p>Biz quyidagi ma'lumotlarni to'playmiz:</p>
              <ul>
                <li><strong>Telegram ma'lumotlari:</strong> Foydalanuvchi nomi, ID, profil rasmi, telefon raqami</li>
                <li><strong>To'lov ma'lumotlari:</strong> Tranzaksiya tarilxi va miqdori (bank ma'lumotlari emas)</li>
                <li><strong>Xizmat ma'lumotlari:</strong> Yuborilgan yulduzlar, referral statistikasi</li>
                <li><strong>Device ma'lumotlari:</strong> Brauzer turi, IP manzili, vaqt mintaqasi</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Biz Ma'lumotlarni Qanday Ishlatamiz?</h2>
              <p>Biz ma'lumotlarni quyidagi maqsadlarda ishlatamiz:</p>
              <ul>
                <li>Yulduzlarni jo'nataish va qabul qilish</li>
                <li>Hisob statistikasini ko'rsatish</li>
                <li>Notekis operatsiyalarni aniqlash</li>
                <li>Xizmatni yaxshilash va xatolarni tuzatish</li>
                <li>Foydalanuvchilar bilan aloqa</li>
                <li>Qonuniy talablarga rioya qilish</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Ma'lumotlarni Kimga Yuboramiz?</h2>
              <p>
                Sizning shaxsiy ma'lumotlarni uchinchi tomonlarga bermiz:
              </p>
              <ul>
                <li><strong>Telegram:</strong> Yulduzlarni jo'natish uchun (ularning xavfsizlik siyosatiga muvoafiq)</li>
                <li><strong>To'lov operatorlari:</strong> HUMO va Payme (ularning siyosatiga muvoafiq)</li>
                <li><strong>Qonun ijroisiga:</strong> Agar qonun talab qilsa</li>
              </ul>
              <p>
                Biz sizning bank ma'lumotlarini hech qachon saqlaz va uchinchi tomonlarga 
                bermasligimiz kafolat beramiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Ma'lumotlarni Qancha Vaqt Saqlaydi?</h2>
              <p>
                <strong>Telegram ma'lumotlari:</strong> Hisab faol bo'lgan vaqtgacha
              </p>
              <p>
                <strong>Tranzaksiya ma'lumotlari:</strong> Qonuni talablar bo'yicha 3 yil
              </p>
              <p>
                <strong>Device ma'lumotlari:</strong> 6 oyga qadar
              </p>
              <p>
                Hisabni o'chirganingizda, barcha shaxsiy ma'lumotlar 30 kun ichida o'chiriladi, 
                lekin qonuni talablar bo'yicha ma'lumotlar saqlash mumkin.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Ma'lumotlarning Xavfsizligi</h2>
              <p>
                Biz sizning ma'lumotlarini himoya qilish uchun:
              </p>
              <ul>
                <li>SSL enkriptlash ishlatamiz</li>
                <li>Xavfsiz serverlar ishlatamiz</li>
                <li>Kirishni cheklash bilan himoya qilamiz</li>
                <li>Muntazam xavfsizlik auditlari o'tkazamiz</li>
              </ul>
              <p>
                Lekin hech qanday internet xizmasi 100% xavfsiz emas. Xavfsizlik muammosi haqida 
                derhal bizga xabar bering.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Sizning Huquqlaringiz</h2>
              <p>
                Sizda quyidagi huquqlar bor:
              </p>
              <ul>
                <li><strong>Kirish:</strong> O'zingiz haqida qanday ma'lumot saqlanaganini bilib olish</li>
                <li><strong>O'zgartirilish:</strong> Noto'g'ri ma'lumotlarni tuzatish</li>
                <li><strong>O'chirish:</strong> O'zingiz haqida ma'lumotlarni o'chirish</li>
                <li><strong>Rozi emas:</strong> Ma'lumotlarning ba'zi ishlatlilishlarga rozi emas deyish</li>
              </ul>
              <p>
                Ushbu huquqlarni amalga oshirish uchun bizning qo'llab-quvvatlash xizmati bilan bog'laning.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Cookies va Tracking</h2>
              <p>
                Biz hisob-kitob, tilni saqlash va xizmatni yaxshilash uchun cookies ishlatamiz. 
                Siz brauzeringizda cookies ni o'chirishingiz mumkin, lekin bu xizmatning ba'zi 
                qismlarini buzi oladi.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Bolalar uchun Xavfsizlik</h2>
              <p>
                Platformani 13 yoshdan ortiq foydalanuvchilar foydalana oladi. Agar siz 13 yoshdan 
                kam bo'lsangiz, Platformani ishlatmang. Agar biz bolaning ma'lumotlarini bilib 
                olsak, biz uni o'chirib tashlaymiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Uchinchi Tomonlar</h2>
              <p>
                Platformamiz Telegram, Payme va HUMO kabi uchinchi tomonlarning xizmatlarini 
                foydalanadi. Ularning maxfiylik siyosatlari ularning mas'uliyligi. Ularning 
                siyosatlari bilan tanishingizni maslahat beramiz.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Siyosatning O'zgartirilishi</h2>
              <p>
                Biz ushbu Siyosatni istalgan vaqt o'zgartira olamiz. O'zgartirishlar e'lon 
                qilingan paytdan kuchga kiradi. Davomiy foydalanish o'zgartirishlarni qabul 
                deb hisoblanadi.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Murojaat</h2>
              <p>
                Siyosat haqida savollar bo'lsa: 
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
                Starsjoy («Мы», «Компания») серьезно относится к конфиденциальности пользователей. 
                Эта Политика конфиденциальности объясняет, как мы собираем, используем и защищаем 
                ваши данные.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Какие данные мы собираем?</h2>
              <p>Мы собираем следующие данные:</p>
              <ul>
                <li><strong>Данные Telegram:</strong> Имя пользователя, ID, фото профиля, номер телефона</li>
                <li><strong>Данные платежа:</strong> История и сумма транзакций (не банковские данные)</li>
                <li><strong>Данные услуги:</strong> Отправленные звезды, статистика рефералов</li>
                <li><strong>Данные устройства:</strong> Тип браузера, IP-адрес, часовой пояс</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Как мы используем данные?</h2>
              <p>Мы используем данные в следующих целях:</p>
              <ul>
                <li>Отправка и получение звезд</li>
                <li>Отображение статистики счета</li>
                <li>Обнаружение подозрительных операций</li>
                <li>Улучшение услуги и исправление ошибок</li>
                <li>Связь с пользователями</li>
                <li>Соблюдение законодательства</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. С кем мы делимся данными?</h2>
              <p>
                Мы предоставляем ваши персональные данные третьим сторонам:
              </p>
              <ul>
                <li><strong>Telegram:</strong> Для отправки звезд (в соответствии с их политикой безопасности)</li>
                <li><strong>Платежные операторы:</strong> HUMO и Payme (в соответствии с их политикой)</li>
                <li><strong>Правоохранительные органы:</strong> Если требует закон</li>
              </ul>
              <p>
                Мы гарантируем, что никогда не будем хранить и не передавать ваши банковские данные 
                третьим лицам.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Как долго мы храним данные?</h2>
              <p>
                <strong>Данные Telegram:</strong> До тех пор, пока учетная запись активна
              </p>
              <p>
                <strong>Данные транзакций:</strong> 3 года в соответствии с законодательством
              </p>
              <p>
                <strong>Данные устройства:</strong> До 6 месяцев
              </p>
              <p>
                При удалении учетной записи все персональные данные удаляются в течение 30 дней, 
                но данные могут сохраняться в соответствии с законодательством.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Безопасность данных</h2>
              <p>
                Чтобы защитить ваши данные, мы:
              </p>
              <ul>
                <li>Используем шифрование SSL</li>
                <li>Используем защищенные серверы</li>
                <li>Защищаем с помощью ограничения доступа</li>
                <li>Проводим регулярные аудиты безопасности</li>
              </ul>
              <p>
                Однако ни один интернет-сервис не является 100% безопасным. Сообщайте нам 
                о проблемах безопасности немедленно.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Ваши права</h2>
              <p>
                У вас есть следующие права:
              </p>
              <ul>
                <li><strong>Доступ:</strong> Узнать, какие данные о вас хранятся</li>
                <li><strong>Исправление:</strong> Исправить неверные данные</li>
                <li><strong>Удаление:</strong> Удалить данные о себе</li>
                <li><strong>Возражение:</strong> Возразить против определенного использования данных</li>
              </ul>
              <p>
                Чтобы осуществить эти права, свяжитесь с нашей службой поддержки.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Cookies и отслеживание</h2>
              <p>
                Мы используем cookies для учета, сохранения языка и улучшения услуги. 
                Вы можете отключить cookies в браузере, но это может нарушить некоторые 
                части услуги.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Безопасность детей</h2>
              <p>
                Платформу могут использовать пользователи старше 13 лет. Если вам меньше 13 лет, 
                не используйте Платформу. Если мы узнаем о данных ребенка, мы их удалим.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Третьи стороны</h2>
              <p>
                Наша Платформа использует услуги третьих сторон, таких как Telegram, Payme и HUMO. 
                Их политики конфиденциальности - их ответственность. Мы рекомендуем ознакомиться 
                с их политиками.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Изменение политики</h2>
              <p>
                Мы можем изменять эту Политику в любое время. Изменения вступают в силу с момента 
                их объявления. Продолжение использования считается принятием изменений.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Контакты</h2>
              <p>
                По вопросам о политике: 
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
                Starsjoy ("We", "Company") takes user privacy seriously. This Privacy Policy 
                explains how we collect, use, and protect your data.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. What Data Do We Collect?</h2>
              <p>We collect the following data:</p>
              <ul>
                <li><strong>Telegram data:</strong> Username, ID, profile photo, phone number</li>
                <li><strong>Payment data:</strong> Transaction history and amount (not banking data)</li>
                <li><strong>Service data:</strong> Stars sent, referral statistics</li>
                <li><strong>Device data:</strong> Browser type, IP address, timezone</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. How Do We Use Data?</h2>
              <p>We use data for the following purposes:</p>
              <ul>
                <li>Sending and receiving Stars</li>
                <li>Displaying account statistics</li>
                <li>Detecting suspicious transactions</li>
                <li>Improving service and fixing errors</li>
                <li>Communicating with users</li>
                <li>Compliance with law</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Who Do We Share Data With?</h2>
              <p>
                We share your personal data with third parties:
              </p>
              <ul>
                <li><strong>Telegram:</strong> For sending Stars (per their security policy)</li>
                <li><strong>Payment operators:</strong> HUMO and Payme (per their policy)</li>
                <li><strong>Law enforcement:</strong> If required by law</li>
              </ul>
              <p>
                We guarantee that we will never store or share your banking data with third parties.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. How Long Do We Keep Data?</h2>
              <p>
                <strong>Telegram data:</strong> While your account is active
              </p>
              <p>
                <strong>Transaction data:</strong> 3 years per legal requirements
              </p>
              <p>
                <strong>Device data:</strong> Up to 6 months
              </p>
              <p>
                When you delete your account, all personal data is deleted within 30 days, 
                but data may be retained per legal requirements.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Data Security</h2>
              <p>
                To protect your data, we:
              </p>
              <ul>
                <li>Use SSL encryption</li>
                <li>Use secure servers</li>
                <li>Protect with access restrictions</li>
                <li>Conduct regular security audits</li>
              </ul>
              <p>
                However, no internet service is 100% secure. Report security issues to us immediately.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Your Rights</h2>
              <p>
                You have the following rights:
              </p>
              <ul>
                <li><strong>Access:</strong> Know what data is stored about you</li>
                <li><strong>Correction:</strong> Correct incorrect data</li>
                <li><strong>Deletion:</strong> Delete your data</li>
                <li><strong>Objection:</strong> Object to certain data uses</li>
              </ul>
              <p>
                To exercise these rights, contact our support team.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Cookies and Tracking</h2>
              <p>
                We use cookies for accounting, saving language, and improving the service. 
                You can disable cookies in your browser, but this may break some parts of the service.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Child Safety</h2>
              <p>
                The Platform may be used by users over 13 years old. If you are under 13, 
                do not use the Platform. If we learn of a child's data, we will delete it.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Third Parties</h2>
              <p>
                Our Platform uses services from third parties like Telegram, Payme, and HUMO. 
                Their privacy policies are their responsibility. We recommend reviewing their policies.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Policy Changes</h2>
              <p>
                We may change this Policy at any time. Changes take effect upon announcement. 
                Continued use constitutes acceptance of changes.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Contact</h2>
              <p>
                For questions about the policy: 
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
