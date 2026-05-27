export default function RulesPage() {
  const rules = [
    {
      num: '01',
      title: 'Управление',
      desc: 'Перемещай курсор мыши по игровому полю — твой персонаж (круг) следует за указателем.',
    },
    {
      num: '02',
      title: 'Враги',
      desc: 'Чёрные квадраты преследуют тебя. Они появляются с краёв поля и постепенно ускоряются.',
    },
    {
      num: '03',
      title: 'Очки',
      desc: 'Очки начисляются за каждую секунду выживания. Чем дольше продержишься — тем выше счёт.',
    },
    {
      num: '04',
      title: 'Конец игры',
      desc: 'Игра заканчивается при столкновении с любым врагом. Рекорд сохраняется автоматически.',
    },
    {
      num: '05',
      title: 'Сложность',
      desc: 'Три режима: Лёгкий (медленные враги), Средний (сбалансировано), Сложный (быстро и много врагов).',
    },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 animate-fade-in">
      <div className="mb-12">
        <p className="font-mono text-xs text-[#888888] tracking-[0.3em] uppercase mb-3">
          MODE_01
        </p>
        <h1 className="font-rajdhani text-4xl font-bold text-[#0d0d0d] tracking-wider uppercase mb-4">
          Правила игры
        </h1>
        <div className="w-16 h-0.5 bg-[#0d0d0d]" />
      </div>

      <div className="space-y-0">
        {rules.map((rule, i) => (
          <div
            key={rule.num}
            className="flex gap-8 py-7 border-b border-[#e0e0e0] animate-fade-in"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <span className="font-mono text-xs text-[#cccccc] tracking-widest mt-1 w-6 flex-shrink-0">
              {rule.num}
            </span>
            <div className="flex-1">
              <h3 className="font-rajdhani font-semibold text-lg text-[#0d0d0d] tracking-wider uppercase mb-1">
                {rule.title}
              </h3>
              <p className="font-rajdhani text-base text-[#666666] leading-relaxed">
                {rule.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 border border-[#e0e0e0] bg-[#fafafa]">
        <p className="font-mono text-xs text-[#888888] tracking-[0.2em] uppercase mb-2">
          Подсказка
        </p>
        <p className="font-rajdhani text-base text-[#555555]">
          Держись в центре поля — так у тебя будет больше пространства для манёвра.
          На высокой сложности враги появляются быстрее и могут окружить тебя.
        </p>
      </div>
    </div>
  );
}
