export function maybeUpsell(condition: boolean, router: { push: (path: string) => void }) {
  if (condition) {
    try {
      router.push('/premium');
    } catch (e) {
      console.log('maybeUpsell navigation error', e);
    }
  }
}