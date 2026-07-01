export const metadata = { title: 'Stay safe on public WiFi — DedSpot' };

export default function SafetyPage() {
  return (
    <>
      <section className="hero">
        <h1>Stay safe on public WiFi</h1>
        <p className="lead">
          Free WiFi is great — but shared networks can expose your data. A few simple habits keep
          you protected.
        </p>
      </section>

      <div className="finder">
        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>Do</h2>
          <ul>
            <li>Prefer sites with the padlock / <strong>HTTPS</strong>.</li>
            <li>Turn off <strong>auto-connect</strong> to open networks.</li>
            <li>Use a <strong>VPN</strong> to encrypt your traffic on public WiFi.</li>
            <li>Keep your phone and apps <strong>updated</strong>.</li>
            <li>Log out of accounts when you finish.</li>
          </ul>
        </div>
        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>Avoid</h2>
          <ul>
            <li>Banking or mobile-financial-service logins on open WiFi.</li>
            <li>Entering passwords on sites without HTTPS.</li>
            <li>Connecting to look-alike networks (check the exact name with staff).</li>
            <li>Sharing private home/office WiFi passwords publicly.</li>
          </ul>
        </div>
      </div>

      <section className="section">
        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>About our VPN protection</h2>
          <p className="muted">
            DedSpot offers a VPN that encrypts your connection on public WiFi. We believe in being
            straight with you: a VPN protects your traffic from others on the same network, but you
            are trusting the VPN provider itself. Our privacy policy will always state plainly what
            we do and do not log. Protection you can trust only works if it is honest.
          </p>
        </div>
      </section>
    </>
  );
}
