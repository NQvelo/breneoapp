export interface GeorgianCity {
  id: string;
  name: string;
  nameKa: string;
}

export const georgianCities: GeorgianCity[] = [
  { id: "tbilisi", name: "Tbilisi", nameKa: "თბილისი" },
  { id: "kutaisi", name: "Kutaisi", nameKa: "ქუთაისი" },
  { id: "batumi", name: "Batumi", nameKa: "ბათუმი" },
  { id: "sokhumi", name: "Sokhumi", nameKa: "სოხუმი" },
  { id: "tskhinvali", name: "Tskhinvali", nameKa: "ცხინვალი" },
  { id: "poti", name: "Poti", nameKa: "ფოთი" },
  { id: "telavi", name: "Telavi", nameKa: "თელავი" },
  { id: "rustavi", name: "Rustavi", nameKa: "რუსთავი" },
  { id: "gori", name: "Gori", nameKa: "გორი" },
  { id: "zugdidi", name: "Zugdidi", nameKa: "ზუგდიდი" },
  { id: "khashuri", name: "Khashuri", nameKa: "ხაშური" },
  { id: "senaki", name: "Senaki", nameKa: "სენაკი" },
  { id: "marneuli", name: "Marneuli", nameKa: "მარნეული" },
  { id: "kobuleti", name: "Kobuleti", nameKa: "ქობულეთი" },
  { id: "akhaltsikhe", name: "Akhaltsikhe", nameKa: "ახალციხე" },
];

export function findGeorgianCityById(id: string): GeorgianCity | undefined {
  return georgianCities.find((c) => c.id === id);
}

/** Display label for UI — English or Georgian based on platform language. */
export function georgianCityLabel(
  city: GeorgianCity,
  language: string,
): string {
  return language === "ka" ? city.nameKa : city.name;
}

export function georgianCityLabelById(id: string, language: string): string {
  const city = findGeorgianCityById(id);
  if (!city) return id;
  return georgianCityLabel(city, language);
}

/** English name for job search API `city` param. */
export function georgianCityApiName(id: string): string {
  return findGeorgianCityById(id)?.name ?? id;
}

export function filterGeorgianCities(
  query: string,
  language: string,
): GeorgianCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return georgianCities;
  return georgianCities.filter((city) => {
    const label = georgianCityLabel(city, language).toLowerCase();
    return (
      label.includes(q) ||
      city.name.toLowerCase().includes(q) ||
      city.nameKa.includes(q) ||
      city.id.includes(q)
    );
  });
}

export const GEORGIA_NAME_KA = "საქართველო";
export const LOCATION_LABEL_KA = "მდებარეობა";
export const SELECT_ALL_KA = "ყველას მონიშვნა";
