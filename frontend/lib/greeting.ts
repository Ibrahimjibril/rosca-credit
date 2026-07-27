export function getGreeting(userName?: string): string {
  const hour = new Date().getHours();
  let timeGreeting: string;

  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }

  return userName ? `${timeGreeting}, ${userName}!` : `${timeGreeting}!`;
}
