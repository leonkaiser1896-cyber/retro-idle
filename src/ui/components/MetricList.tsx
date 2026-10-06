interface Metric {
  label: string;
  value: string;
}

interface MetricListProps {
  items: Metric[];
  className?: string;
}

export function MetricList({ className, items }: MetricListProps) {
  return (
    <dl className={className ? `metric-list ${className}` : "metric-list"}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
