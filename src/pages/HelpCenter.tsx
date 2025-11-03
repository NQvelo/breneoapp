import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Search,
  Mail,
  Phone,
  MessageCircle,
  BookOpen,
  CircleUserRound,
  Settings,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const HelpCenter = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  // FAQ Categories
  const faqCategories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      questions: [
        {
          q: "როგორ დავიწყო Breneo-ს გამოყენება?",
          a: 'პლატფორმის გამოყენების დაწყებისთვის, თქვენ უნდა შექმნათ ანგარიში. დააწკაპუნეთ "რეგისტრაციაზე" და შეიყვანეთ თქვენი პირადი მონაცემები. დარეგისტრების შემდეგ, მოგიწოდებთ ტესტების გავლას, რათა გამოვლინდეს თქვენი ინტერესები და უნარები.',
        },
        {
          q: "როგორ შევქმნა პროფილი?",
          a: 'პროფილის შესაქმნელად, დააწკაპუნეთ თქვენი სახელზე ან სახელი-სურათზე მწვანე გარშემო, შემდეგ აირჩიეთ "Profile". იქ შეგიძლიათ შეავსოთ თქვენი პირადი ინფორმაცია, აიტვირთოთ ფოტო და შეიტანოთ დამატებითი მონაცემები.',
        },
        {
          q: "რა არის უნარების ტესტი?",
          a: "უნარების ტესტი - ეს არის ინტერაქტიული საშუალება, რომელიც ეხმარება შევაფასოთ თქვენი მიმდინარე უნარები სხვადასხვა დარგებში. ტესტის გავლის შემდეგ, თქვენ მიიღებთ დეტალურ ანალიტიკას და პერსონალიზებულ რეკომენდაციებს.",
        },
      ],
    },
    {
      title: "Account & Profile",
      icon: CircleUserRound,
      questions: [
        {
          q: "როგორ შევცვალო ელფოსტა?",
          a: 'ელფოსტის შესაცვლელად გადადით Settings გვერდზე (დაწკაპუნეთ Settings ხუროვანზე მარცხენა მხარეს). იქ იპოვით "Change Email" ღილაკს. დააწკაპუნეთ მას და მიჰყევით ინსტრუქციებს.',
        },
        {
          q: "როგორ აღვადგინო პაროლი?",
          a: 'თუ დაგავიწყდათ პაროლი, ლოგინის გვერდზე დააწკაპუნეთ "Forgot Password" ბმულზე. შეიყვანეთ თქვენი ელფოსტა და მოგვივა ბმული პაროლის გადასაყენებლად.',
        },
        {
          q: "როგორ წავშალო ანგარიში?",
          a: 'ანგარიშის წასაშლელად გადადით Settings გვერდზე და გადადით "Account Settings" განყოფილებაში. იქ იპოვით "Delete Account" ღილაკს. გთხოვთ, გაითვალისწინოთ, რომ ამ ოპერაცია შეუქცევადია.',
        },
      ],
    },
    {
      title: "Jobs & Career",
      icon: Briefcase,
      questions: [
        {
          q: "როგორ ვიპოვო სამუშაო?",
          a: 'სამუშაოს საპოვნელად გადადით "Jobs" გვერდზე. იქ თქვენ შეგიძლიათ დაფილტროთ სამუშაოები კატეგორიის, ლოკაციის, ხელფასისა და სხვა კრიტერიუმების მიხედვით. თქვენი პროფილისა და ტესტების შედეგების საფუძველზე, ჩვენ ავტომატურად გიწოდებთ შესაბამის შეთავაზებებს.',
        },
        {
          q: "როგორ გავაკეთო განაცხადა სამუშაოზე?",
          a: 'სამუშაოს განსათხვრელად, დააკლიკეთ სამუშაოს შესახებ მეტის სანახავად. იქ ნახავთ დეტალურ ინფორმაციას და "Apply Now" ღილაკს. დაჭერით ამ ღილაკზე და დაასრულებთ განაცხადს.',
        },
        {
          q: "როგორ შევინახო სამუშაო შემდეგისთვის?",
          a: 'სამუშაოს შესანახად, დააკლიკეთ სამუშაოს ბარათზე და აირჩიეთ "Save" ღილაკს. შემდეგ შედგენილ სამუშაოებს იპოვით თქვენი პროფილის "Saved Jobs" განყოფილებაში.',
        },
      ],
    },
    {
      title: "Settings & Customization",
      icon: Settings,
      questions: [
        {
          q: "როგორ შევცვალო ზოგადი პარამეტრები?",
          a: "ზოგადი პარამეტრების შესაცვლელად გადადით Settings გვერდზე. იქ შეგიძლიათ შეცვალოთ ენა, თემა (ლაით/დარქი), შეტყობინებები და სხვა პრეფერენსები.",
        },
        {
          q: "როგორ შევაჩერო შეტყობინებები?",
          a: 'შეტყობინებების შესაჩერებლად გადადით Settings გვერდზე და აირჩიეთ "Notifications" განყოფილება. იქ შეგიძლიათ ამორთოთ განსხვავებული ტიპის შეტყობინებები.',
        },
        {
          q: "როგორ შევცვალო პროფილის ფოტო?",
          a: "პროფილის ფოტოს შესაცვლელად, გადადით თქვენი პროფილის გვერდზე და დააწკაპუნეთ ფოტოს რედაქტირების ხაზზე. შეგიძლიათ აიტვირთოთ ახალი ფოტო თქვენი კომპიუტერიდან.",
        },
      ],
    },
  ];

  // Filter FAQs based on search query
  const filteredFAQs = faqCategories.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <div className="h-screen bg-breneo-lightgray overflow-hidden">
      <AppSidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />

      <main
        className={`h-full overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-24" : "md:ml-[17rem]"
        } pt-24 pb-32 md:pt-24 md:pb-0 px-3 md:px-6`}
      >
        <div className="max-w-4xl mx-auto py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Help Center</h1>
            <p className="text-gray-600">
              ჩვენ ეხმარებით თქვენს კითხვებზე პასუხების პოვნაში
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              type="text"
              placeholder="შეიყვანეთ თქვენი კითხვა..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-6 text-lg"
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-2">
                  <Mail className="text-breneo-blue" size={24} />
                </div>
                <CardTitle className="text-base">Email Support</CardTitle>
                <CardDescription>support@breneo.app</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-2">
                  <Phone className="text-breneo-blue" size={24} />
                </div>
                <CardTitle className="text-base">Phone Support</CardTitle>
                <CardDescription>Available 24/7</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-breneo-blue/10 rounded-lg flex items-center justify-center mb-2">
                  <MessageCircle className="text-breneo-blue" size={24} />
                </div>
                <CardTitle className="text-base">Live Chat</CardTitle>
                <CardDescription>Get instant help</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-6">
            {filteredFAQs.map(
              (category, categoryIndex) =>
                category.questions.length > 0 && (
                  <Card key={categoryIndex} className="bg-white">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-breneo-blue/10 rounded-lg flex items-center justify-center">
                          <category.icon
                            className="text-breneo-blue"
                            size={20}
                          />
                        </div>
                        <CardTitle>{category.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {category.questions.map((item, itemIndex) => (
                          <AccordionItem
                            key={itemIndex}
                            value={`${categoryIndex}-${itemIndex}`}
                            className="border-gray-200"
                          >
                            <AccordionTrigger className="text-left font-semibold hover:no-underline">
                              {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                              {item.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                )
            )}
          </div>

          {/* Contact Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Card className="bg-gradient-to-r from-breneo-blue/5 to-breneo-blue/10">
              <CardContent className="py-8 text-center">
                <h3 className="text-xl font-bold mb-2">
                  მაინც არ იპოვეთ პასუხი?
                </h3>
                <p className="text-gray-600 mb-4">
                  დაგვიკავშირდით და ჩვენ მზად ვართ დაგეხმაროთ
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="mailto:support@breneo.app"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-breneo-blue text-white rounded-lg hover:bg-breneo-blue/90 transition-colors"
                  >
                    <Mail size={18} />
                    Email Support
                  </a>
                  <a
                    href="tel:+995500992990"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-breneo-blue text-breneo-blue rounded-lg hover:bg-breneo-blue/5 transition-colors"
                  >
                    <Phone size={18} />
                    Call Us
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpCenter;
