export default function AboutPage() {
  const facts = [
    { label: 'Название', value: 'ZG Corp' },
    { label: 'Жанр', value: 'Аркада / Выживание' },
    { label: 'Режим', value: 'MODE_01 — Догонялки' },
    { label: 'Управление', value: 'Только мышь' },
    { label: 'Платформа', value: 'Браузер' },
    { label: 'Версия', value: '1.0.0' },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 animate-fade-in">
      <div className="mb-12">
        <p className="font-mono text-xs text-[#888888] tracking-[0.3em] uppercase mb-3">
          О ПРОЕКТЕ
        </p>
        <h1 className="font-rajdhani text-4xl font-bold text-[#0d0d0d] tracking-wider uppercase mb-4">
          ZG Corp
        </h1>
        <div className="w-16 h-0.5 bg-[#0d0d0d]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: description */}
        <div className="space-y-5">
          <p className="font-rajdhani text-lg text-[#444444] leading-relaxed">
            ZG Corp — минималистичная браузерная игра в жанре аркада.
            Чистый дизайн, никаких лишних деталей — только скорость и реакция.
          </p>
          <p className="font-rajdhani text-base text-[#666666] leading-relaxed">
            Первый режим игры — классические догонялки. Ты управляешь кругом,
            враги в виде чёрных квадратов преследуют тебя со всех сторон.
            Задача проста: продержаться как можно дольше и набрать максимум очков.
          </p>
          <p className="font-rajdhani text-base text-[#666666] leading-relaxed">
            В будущем планируются новые игровые режимы, таблица лидеров
            и дополнительные механики.
          </p>

          <div className="pt-4">
            <p className="font-mono text-xs text-[#cccccc] tracking-[0.2em] uppercase mb-3">
              Скоро
            </p>
            <div className="space-y-2">
              {['MODE_02 — Лабиринт', 'MODE_03 — Снайпер', 'Таблица лидеров'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-[#e0e0e0]" />
                  <span className="font-mono text-xs text-[#aaaaaa] tracking-wider uppercase">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: facts table */}
        <div>
          <div className="border border-[#e0e0e0]">
            {facts.map((fact, i) => (
              <div
                key={fact.label}
                className={`flex items-center justify-between px-5 py-4 animate-fade-in ${
                  i < facts.length - 1 ? 'border-b border-[#e0e0e0]' : ''
                }`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="font-mono text-xs text-[#aaaaaa] tracking-widest uppercase">
                  {fact.label}
                </span>
                <span className="font-rajdhani font-semibold text-sm text-[#0d0d0d] tracking-wider">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>

          {/* Visual element */}
          <div className="mt-8 p-6 border border-[#e0e0e0] flex items-center gap-4">
            <div className="w-10 h-10 bg-[#0d0d0d] flex-shrink-0" />
            <div>
              <p className="font-rajdhani font-semibold text-sm text-[#0d0d0d] tracking-wider uppercase mb-0.5">
                Концепция
              </p>
              <p className="font-rajdhani text-sm text-[#888888]">
                Минимализм. Скорость. Реакция.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
