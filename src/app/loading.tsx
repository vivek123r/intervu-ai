export default function Loading() {
  return (
    <main className="route-loading" aria-label="Loading Intervu workspace" aria-busy="true">
      <div>
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
      <section>
        <span className="skeleton" />
        <span className="skeleton" />
      </section>
    </main>
  );
}
