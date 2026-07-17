import { site } from '../data/site'

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero__pattern" aria-hidden="true" />
      <div className="hero__inner">
        <h1 className="hero__name">{site.nickname}</h1>
        <p className="hero__line">{site.heroLine}</p>
        <p className="hero__meta">Together since · {site.metLabel}</p>
        <a className="btn btn--gold" href="#timeline">
          {site.heroCta}
        </a>
      </div>
    </header>
  )
}
