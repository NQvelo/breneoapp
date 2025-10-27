import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";

const TermsOfUse = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="h-screen bg-breneo-lightgray overflow-hidden">
      <AppSidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />

      <main
        className={`h-full overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-24" : "md:ml-[17rem]"
        } pt-24 pb-20 md:pt-24 md:pb-0 px-3 md:px-6`}
      >
        <div className="max-w-4xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-8 text-left">
            გამოყენების პირობები
          </h1>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700 leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                1. ზოგადი ინფორმაცია
              </h2>
              <p>
                Breneo წარმოადგენს ინოვაციურ ონლაინ პლატფორმას, რომელიც ეხმარება
                მომხმარებლებს პროფესიული გზის განსაზღვრასა და უნარების
                განვითარებაში. სერვისი უზრუნველყოფს:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>ინტერესების და უნარების ტესტირებასა და შეფასებას,</li>
                <li>პერსონალიზებულ სასწავლო რეკომენდაციებს,</li>
                <li>სამუშაო შეთავაზებებსა და შესაძლებლობების შერჩევას,</li>
                <li>პროგრესის მონიტორინგსა და ანალიტიკას.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                2. რეგისტრაცია და მომხმარებლის ანგარიში
              </h2>
              <p>
                პლატფორმის გამოყენებისთვის აუცილებელია ანგარიშის შექმნა სანდო და
                ზუსტი ინფორმაციის გამოყენებით.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  თქვენ ხართ პასუხისმგებელი თქვენი ანგარიშის უსაფრთხოებაზე და არ
                  შეგიძლიათ მესამე პირს მისცეთ წვდომა თქვენს პროფილზე.
                </li>
                <li>
                  Breneo-ს უფლება აქვს დაბლოკოს ან გააუქმოს ანგარიში წესების
                  დარღვევისას.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                3. ხელოვნური ინტელექტის გამოყენება
              </h2>
              <p>
                Breneo იყენებს ხელოვნური ინტელექტის მოდელებს უნარების შეფასებისა
                და რეკომენდაციების შესაქმნელად. AI-ის მიერ შემოთავაზებული
                შედეგები და დასკვნები არის დამხმარე ხასიათის და არ წარმოადგენს
                საბოლოო პროფესიულ გადაწყვეტილებას.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                4. პლატფორმის გამოყენების წესი
              </h2>
              <p>
                მომხმარებელმა უნდა გამოიყენოს Breneo მხოლოდ კანონიერ და ეთიკურ
                მიზნებისთვის. აკრძალულია:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  პლატფორმის ბოროტად გამოყენება ან მისი ფუნქციონირების დარღვევა,
                </li>
                <li>
                  ავტომატიზებული სისტემების გამოყენება მონაცემების მოპოვების
                  მიზნით,
                </li>
                <li>
                  მესამე მხარის მონაცემების შეგროვება ან გავრცელება მათი
                  თანხმობის გარეშე,
                </li>
                <li>
                  პლატფორმის მასალების კოპირება, შეცვლა ან გაყიდვა Breneo-ს
                  ნებართვის გარეშე.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                5. ინტელექტუალური საკუთრება
              </h2>
              <p>
                Breneo-ზე გამოქვეყნებული ყველა მასალა — მათ შორის ტექსტი,
                დიზაინი, ალგორითმები, ვიზუალური ელემენტები, ვიდეო და ლოგო —
                წარმოადგენს Breneo-ს ან მისი პარტნიორების საკუთრებას. მათი
                გამოყენება დაშვებულია მხოლოდ Breneo-ს წერილობითი თანხმობით.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                6. კონფიდენციალურობა და მონაცემთა დაცვა
              </h2>
              <p>
                Breneo იცავს მომხმარებლების პირად ინფორმაციას საქართველოს
                მოქმედი კანონმდებლობისა და GDPR-ის პრინციპების შესაბამისად.
                პირადი მონაცემების შეგროვება და გამოყენება განისაზღვრება ჩვენი
                კონფიდენციალურობის პოლიტიკით, რომელიც ხელმისაწვდომია
                პლატფორმაზე.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                7. კომუნიკაცია და შეტყობინებები
              </h2>
              <p>
                რეგისტრაციისას მითითებული ელფოსტა ან ტელეფონის ნომერი
                გამოიყენება ადმინისტრაციული შეტყობინებებისა და სერვისთან
                დაკავშირებული ინფორმაციის გადასაცემად. თქვენ შეგიძლიათ ნებისმიერ
                დროს შეცვალოთ შეტყობინებების პარამეტრები პროფილის მენიუდან.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                8. პასუხისმგებლობის შეზღუდვა
              </h2>
              <p>
                Breneo უზრუნველყოფს სერვისს „როგორც არის" ("as is") პრინციპით.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  ჩვენ არ ვაგებთ პასუხს ტექნიკურ შეფერხებებზე, მონაცემთა
                  დაკარგვაზე ან მესამე მხარის მიერ გამოწვეულ ზიანზე.
                </li>
                <li>
                  Breneo არ იძლევა გარანტიას, რომ ყველა რეკომენდაცია იქნება
                  ზუსტი ან შესაფერისი კონკრეტული მომხმარებლისთვის.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                9. მესამე მხარეების ბმულები
              </h2>
              <p>
                პლატფორმა შესაძლოა შეიცავდეს ბმულებს გარე ვებსაიტებზე. ჩვენ არ
                ვართ პასუხისმგებელი მათ შინაარსზე ან მონაცემთა დამუშავების
                პოლიტიკაზე. გთხოვთ, გაეცნოთ თითოეული საიტის წესებს
                დამოუკიდებლად.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                10. სერვისის ცვლილება და ხელმისაწვდომობა
              </h2>
              <p>
                Breneo იტოვებს უფლებას ნებისმიერ დროს განაახლოს, შეცვალოს ან
                დროებით შეწყვიტოს პლატფორმის კონკრეტული ფუნქციები მომხმარებლის
                წინასწარი გაფრთხილების გარეშე.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                11. პირობების ცვლილება
              </h2>
              <p>
                ეს პირობები შესაძლოა პერიოდულად განახლდეს. ცვლილების შემთხვევაში
                შესაბამისი ინფორმაცია გამოქვეყნდება Breneo-ს მთავარ გვერდზე, და
                განახლებული პირობების მიღება მოხდება პლატფორმის შემდგომი
                გამოყენებით.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-breneo-blue">
                12. საკონტაქტო ინფორმაცია
              </h2>
              <p>
                თუ გაქვთ კითხვები, რეკომენდაციები ან პრეტენზიები, შეგიძლიათ
                დაგვიკავშირდეთ:
              </p>
              <div className="space-y-2 text-lg">
                <p>📩 support@breneo.app</p>
                <p>🌐 www.breneo.app</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
            <p>ბოლო განახლება: {new Date().toLocaleDateString("ka-GE")}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfUse;
