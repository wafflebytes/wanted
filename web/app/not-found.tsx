import Link from 'next/link';
import { Art } from '@web/components/Art';

export default function NotFound() {
  return (
    <main className="lost">
      <Art name="binoculars" size={148} />
      <h1>Nothing at this address.</h1>
      <p>Gus looked. The link might be old, or the act moved on.</p>
      <Link className="btn hot" href="/">
        Go to Wanted
      </Link>
    </main>
  );
}
