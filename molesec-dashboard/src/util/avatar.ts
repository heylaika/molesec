export const initials = (name: string) => {
  const [first, second] = name.split(/\s/);
  const firstChar = charAt(first, 0);

  if (firstChar.length > 1) return firstChar;

  return first?.length && second?.length
    ? firstChar + charAt(second, 0)
    : first.length > 1
    ? firstChar + charAt(first, 1)
    : firstChar;
};

const charAt = (str: string, index: number) => {
  const code = str.codePointAt(index);
  return code ? String.fromCodePoint(code) : "";
};
