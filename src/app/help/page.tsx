import Link from "next/link";
import "../help.css";
import { HelpAudienceSwitcher } from "@/components/help-audience-switcher";
import { getDefaultHelpAudience } from "@/lib/help-context";
import { getHelpContent, type HelpAudience } from "@/lib/help-content";

export const dynamic = "force-dynamic";

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const defaultAudience = await getDefaultHelpAudience();
  const audience: HelpAudience =
    params.audience === "customer" || params.audience === "contractor"
      ? params.audience
      : defaultAudience;
  const content = getHelpContent(audience);
  const returnTo =
    params.returnTo && /^\/(client-portal|overview|projects|settings|billing)/.test(params.returnTo)
      ? params.returnTo
      : undefined;

  return (
    <main className="help-page">
      <header className="help-header">
        <div className="help-header-inner">
          <Link className="home-brand" href={returnTo ?? "/help"} aria-label="Back to JengaNasi">
            <span className="home-brand-mark" aria-hidden="true">J</span>
            <span className="home-brand-name">Jenga<span>Nasi</span></span>
          </Link>
          <Link className="home-sign-in" href={returnTo ?? "/overview"}>
            Back to workspace
          </Link>
        </div>
      </header>

      <div className="help-content">
        <section className="help-hero">
          <p className="home-eyebrow">
            <span className="home-eyebrow-line" />
            {content.eyebrow}
          </p>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <HelpAudienceSwitcher current={audience} />
        </section>

        <nav className="help-quick-links" aria-label="Popular tasks">
          {content.quickStart.map((item, index) => (
            <a
              className="help-quick-card"
              href={item.href ?? `#${content.categories[0]?.id ?? "help"}`}
              key={item.title}
            >
              <span className="help-quick-number">{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </a>
          ))}
        </nav>

        {content.categories.map((category) => (
          <section className="help-category" id={category.id} key={category.id}>
            <div className="help-category-heading">
              <h2>{category.title}</h2>
              <p>{category.description}</p>
            </div>
            <div className="help-articles">
              {category.articles.map((article) => (
                <details className="help-article" key={article.id} id={article.id}>
                  <summary>
                    <span>
                      <strong>{article.title}</strong>
                      <small>{article.summary}</small>
                    </span>
                    <span className="help-article-toggle" aria-hidden="true">+</span>
                  </summary>
                  <div className="help-article-body">
                    {article.sections.map((section) => (
                      <section key={section.heading}>
                        <h3>{section.heading}</h3>
                        <p>{section.body}</p>
                        {section.steps && (
                          <ol>
                            {section.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        )}
                      </section>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="help-faq" id="faq">
          <div className="help-category-heading">
            <h2>Frequently asked questions</h2>
            <p>Short answers to the questions we hear most often.</p>
          </div>
          <div className="help-articles">
            {content.faqs.map((faq) => (
              <details className="help-article" key={faq.question}>
                <summary>
                  <span><strong>{faq.question}</strong></span>
                  <span className="help-article-toggle" aria-hidden="true">+</span>
                </summary>
                <div className="help-article-body"><p>{faq.answer}</p></div>
              </details>
            ))}
          </div>
        </section>

        <aside className="help-contact">
          <h2>{content.contact.title}</h2>
          <p>{content.contact.body}</p>
        </aside>
      </div>
    </main>
  );
}
