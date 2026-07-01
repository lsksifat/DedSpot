import SubmitForm from '@/components/SubmitForm';

export const metadata = { title: 'Add a WiFi spot — DedSpot' };

export default function SubmitPage() {
  return (
    <>
      <section className="hero">
        <h1>Add a free WiFi spot</h1>
        <p className="lead">
          Help the community. New spots are reviewed before they go live, to keep the map accurate
          and safe. Please only submit places you have actually visited.
        </p>
      </section>
      <SubmitForm />
    </>
  );
}
