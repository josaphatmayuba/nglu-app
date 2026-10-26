

export default function numberToWords (num){
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const thousands = ["", "Thousand", "Million", "Billion"];

  if (num === 0) return "Zero";

  const getWord = (num) => {
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100)
      return (
        tens[Math.floor(num / 10)] +
        (num % 10 !== 0 ? " " + units[num % 10] : "")
      );
    if (num < 1000)
      return (
        units[Math.floor(num / 100)] +
        " Hundred" +
        (num % 100 !== 0 ? " " + getWord(num % 100) : "")
      );
    return "";
  };

  let result = "";
  let count = 0;

  while (num > 0) {
    if (num % 1000 !== 0) {
      result = getWord(num % 1000) + " " + thousands[count] + " " + result;
    }
    num = Math.floor(num / 1000);
    count++;
  }

  return result.trim();
}

// Montant en lettres AVEC centimes, sans jamais arrondir a l'unite.
// Separation entier / centimes sans flottant : Math.round(x * 100) puis
// division entiere et modulo 100. Devise = nom/code fourni par l'appelant.
export function splitAmountCents(amount) {
  const total = Math.round(Math.abs(Number(amount) || 0) * 100);
  return { units: Math.floor(total / 100), cents: total % 100 };
}

export function amountToWords(amount, currencyName) {
  const { units, cents } = splitAmountCents(amount);
  const currency = (currencyName || "").toString().trim();
  const unitsWords = units === 0 ? "Zero" : numberToWords(units);
  // "One Dollar" et non "One Dollars" : singulier quand l'unité vaut 1.
  const unitCurrency = units === 1 ? currency.replace(/^(\S+?)s(?=\s|$)/i, "$1") : currency;
  let result = currency ? `${unitsWords} ${unitCurrency}` : unitsWords;
  if (cents > 0) {
    const centName = /usd|eur|cad|dollar|euro|\$|€/i.test(currency)
      ? cents === 1 ? "Cent" : "Cents"
      : cents === 1 ? "Centime" : "Centimes";
    result += ` and ${numberToWords(cents)} ${centName}`;
  }
  return result;
}
