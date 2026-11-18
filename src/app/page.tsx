import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  HardHat,
  Layers3,
  MapPin,
  MoveUpRight,
} from "lucide-react";
import Link from "next/link";

const projectPhases = [
  { name: "Site preparation", progress: 100, tone: "complete" },
  { name: "Main structure", progress: 68, tone: "active" },
  { name: "Interior finishes", progress: 24, tone: "upcoming" },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <Link className="home-brand" href="/" aria-label="JengaNasi home">
            <span className="home-brand-mark" aria-hidden="true">J</span>
            <span className="home-brand-name">Jenga<span>Nasi</span></span>
          </Link>

          <nav className="home-nav" aria-label="Main navigation">
            <Link href="#platform">Platform</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#built-for-teams">For your team</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>

          <div className="home-header-actions">
            <Link className="home-sign-in" href="/sign-in">Sign in</Link>
            <Link className="home-header-cta" href="/sign-up">
              Get started <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-eyebrow">
              <span className="home-eyebrow-line" />
              A better way to build, together
            </p>
            <h1>Every project,<br /><span>moving forward.</span></h1>
            <p className="home-hero-description">
              Bring your projects and people into one clear view. JengaNasi
              helps construction teams stay aligned from the first plan to the
              final handover.
            </p>
            <div className="home-hero-actions">
              <Link className="home-primary-cta" href="/sign-up">
                Build your workspace <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="home-secondary-cta" href="#platform">
                Explore the platform <ArrowDownRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-hero-note">
              <span className="home-note-check"><Check size={13} aria-hidden="true" /></span>
              <span>Made for the people who make places.</span>
            </div>
          </div>

          <div
            className="home-hero-visual"
            role="img"
            aria-label="Illustrative construction project dashboard for a Nairobi residence"
          >
            <div className="home-visual-sun" />
            <div className="home-blueprint-label">
              <span>BUILT WITH CLARITY</span>
              <span className="home-blueprint-rule" />
            </div>
            <svg
              className="home-building-art"
              viewBox="0 0 640 500"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="building-sky" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#f8d77e" stopOpacity=".55" />
                  <stop offset="1" stopColor="#f8d77e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M92 402h478" stroke="#293442" strokeOpacity=".2" strokeWidth="2" />
              <path d="M140 399V223l102-62v238" fill="#efe9dc" stroke="#24303d" strokeWidth="3" />
              <path d="M242 399V161l123 68v170" fill="#fffdf8" stroke="#24303d" strokeWidth="3" />
              <path d="M365 399V229l82-47v217" fill="#e1d8c8" stroke="#24303d" strokeWidth="3" />
              <path d="M154 237l79-48M154 282l79-48M154 327l79-48M154 372l79-48" stroke="#b6a992" strokeWidth="2" />
              <path d="M257 200l92 51M257 244l92 51M257 288l92 51M257 332l92 51" stroke="#c3b9a7" strokeWidth="2" />
              <path d="M377 246l56-32M377 289l56-32M377 332l56-32M377 375l56-32" stroke="#a99c87" strokeWidth="2" />
              <path d="M173 243h22v35h-22zM207 223h19v35h-19zM173 289h22v34h-22zM207 269h19v34h-19zM173 334h22v34h-22zM207 314h19v34h-19z" fill="#f3bd35" />
              <path d="M274 226h23v38h-23zM311 246h22v38h-22zM274 273h23v38h-23zM311 293h22v38h-22zM274 320h23v38h-23zM311 340h22v38h-22z" fill="#dbe8e6" />
              <path d="M391 252h17v31h-17zM417 237h17v31h-17zM391 296h17v31h-17zM417 281h17v31h-17zM391 340h17v31h-17zM417 325h17v31h-17z" fill="#f3bd35" />
              <path d="M164 208l78-47M239 157V92h8v68M243 96h188M338 96l-39 14M338 96l-39-14M423 96v41h-4V96" fill="none" stroke="#25313c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
              <path d="M405 137h37v6h-37z" fill="#e7ae2a" />
              <path d="M93 400h397l-42 17H74z" fill="#d5aa45" />
              <path d="M135 421h345" stroke="#25313c" strokeOpacity=".25" strokeWidth="2" />
              <path d="M509 398v-44l29-16 29 16v44" fill="#d8e2dd" stroke="#34413f" strokeWidth="2" />
              <path d="M521 398v-31h35v31" fill="#f8f6ef" stroke="#34413f" strokeWidth="2" />
              <path d="M80 399l20-29 19 29M478 399l19-32 19 32" fill="#96a987" />
              <path d="M93 399l7-21M486 399l11-25M511 399l7-22M531 399l7-25M553 399l10-17" stroke="#657a5c" strokeWidth="3" />
              <circle cx="111" cy="173" r="52" fill="url(#building-sky)" />
              <path d="M64 442h510" stroke="#25313c" strokeOpacity=".1" strokeWidth="1" />
            </svg>

            <div className="home-project-card">
              <div className="home-project-card-top">
                <span className="home-project-icon"><Layers3 size={15} aria-hidden="true" /></span>
                <span className="home-project-label">PROJECT OVERVIEW</span>
                <span className="home-project-menu" aria-hidden="true">···</span>
              </div>
              <div className="home-project-title-row">
                <div>
                  <p className="home-project-code">JN-024 · RESIDENTIAL</p>
                  <h2>Kilimani Residence</h2>
                </div>
                <span className="home-project-status"><span /> In progress</span>
              </div>
              <div className="home-project-location">
                <MapPin size={13} aria-hidden="true" />
                Nairobi, Kenya
              </div>
              <div className="home-project-progress">
                <div className="home-progress-heading">
                  <span>Overall progress</span>
                  <strong>68%</strong>
                </div>
                <div className="home-progress-track"><span /></div>
              </div>
              <div className="home-phase-list">
                {projectPhases.map((phase) => (
                  <div className="home-phase-row" key={phase.name}>
                    <span className={`home-phase-dot home-phase-${phase.tone}`} />
                    <span>{phase.name}</span>
                    <strong>{phase.progress}%</strong>
                  </div>
                ))}
              </div>
              <div className="home-project-footer">
                <span className="home-avatar-stack" aria-hidden="true">
                  <i>JM</i><i>AK</i><i>+3</i>
                </span>
                <span>Team workspace</span>
                <MoveUpRight size={14} aria-hidden="true" />
              </div>
            </div>

            <div className="home-floating-note">
              <span className="home-floating-icon"><BarChart3 size={17} aria-hidden="true" /></span>
              <span><strong>One clear view</strong><small>From site to office</small></span>
            </div>
            <div className="home-visual-caption">
              <span className="home-caption-line" />
              <span>MAKE PROGRESS VISIBLE</span>
            </div>
          </div>
        </div>
        <div className="home-scroll-cue" aria-hidden="true">
          <span /> SCROLL TO EXPLORE
        </div>
      </section>

      <section className="home-platform" id="platform">
        <div className="home-section-inner">
          <div className="home-platform-intro">
            <p className="home-eyebrow"><span className="home-eyebrow-line" />THE JENGANASI DIFFERENCE</p>
            <h2>Less chasing.<br /><span>More building.</span></h2>
            <p>
              Construction has enough moving parts. Give your team a shared
              place to see what’s happening and keep the work moving.
            </p>
            <Link className="home-platform-link" href="/sign-up">
              See what your team can do <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-feature-grid" id="built-for-teams">
            <article className="home-feature-card home-feature-card-dark">
              <span className="home-feature-icon"><ClipboardCheck size={21} aria-hidden="true" /></span>
              <span className="home-feature-number">01 / PROJECTS</span>
              <h3>Know where every project stands.</h3>
              <p>Keep project details, status and progress together in a view your whole team can understand.</p>
              <span className="home-feature-arrow"><ArrowRight size={17} aria-hidden="true" /></span>
            </article>
            <article className="home-feature-card">
              <span className="home-feature-icon"><HardHat size={21} aria-hidden="true" /></span>
              <span className="home-feature-number">02 / PEOPLE</span>
              <h3>Keep your team on the same page.</h3>
              <p>Give the people behind the work a shared starting point, from the office to the jobsite.</p>
              <span className="home-feature-arrow"><ArrowRight size={17} aria-hidden="true" /></span>
            </article>
          </div>
        </div>
      </section>

      <section className="home-workflow" id="how-it-works">
        <div className="home-workflow-inner">
          <div className="home-workflow-heading">
            <p className="home-eyebrow"><span className="home-eyebrow-line" />A CLEARER WAY FORWARD</p>
            <h2>Good work starts<br />with a clear view.</h2>
          </div>
          <div className="home-workflow-steps">
            <article>
              <span>01</span>
              <div><h3>Bring your work together</h3><p>Set up your company workspace and create a home for your projects.</p></div>
            </article>
            <article>
              <span>02</span>
              <div><h3>Make progress easy to see</h3><p>Give each project a clear status, a target and a shared sense of direction.</p></div>
            </article>
            <article>
              <span>03</span>
              <div><h3>Move forward as one team</h3><p>Keep the important details close and build with more confidence, together.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-cta-band">
        <div className="home-cta-decoration" aria-hidden="true"><span /><span /><span /></div>
        <div className="home-cta-content">
          <span className="home-cta-kicker">YOUR NEXT PROJECT STARTS HERE</span>
          <h2>Let’s build something<br /><span>worth getting right.</span></h2>
          <p>Set up a workspace for your team and start with a clearer view.</p>
          <Link className="home-primary-cta home-cta-button" href="/sign-up">
            Create your workspace <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-cta-stamp" aria-hidden="true"><span>J</span><small>BUILD<br />TOGETHER</small></div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <Link className="home-brand" href="/" aria-label="JengaNasi home">
            <span className="home-brand-mark" aria-hidden="true">J</span>
            <span className="home-brand-name">Jenga<span>Nasi</span></span>
          </Link>
          <p>Construction, in good company.</p>
          <span className="home-footer-copyright">© {new Date().getFullYear()} JengaNasi</span>
        </div>
      </footer>
    </main>
  );
}
