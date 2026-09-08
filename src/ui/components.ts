// Reusable Sharp-Corner UI Component Utilities (Emil Kowalski Design Engineering)

export function createSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  initialValue: number,
  unit: string = '',
  onChange: (val: number) => void
): { container: HTMLElement; updateValue: (v: number) => void } {
  const container = document.createElement('div');
  container.className = 'slider-group';

  const labelRow = document.createElement('div');
  labelRow.className = 'slider-label-row';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'slider-name';
  nameSpan.textContent = label;

  const valSpan = document.createElement('span');
  valSpan.className = 'slider-val caption';
  valSpan.id = `${id}-val`;
  valSpan.textContent = `${initialValue}${unit}`;

  labelRow.appendChild(nameSpan);
  labelRow.appendChild(valSpan);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = id;
  slider.className = 'sharp-slider';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initialValue);
  slider.setAttribute('aria-label', label);

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    const displayVal = step < 0.01 ? val.toFixed(4) : step < 0.1 ? val.toFixed(2) : String(val);
    valSpan.textContent = `${displayVal}${unit}`;
    onChange(val);
  });

  container.appendChild(labelRow);
  container.appendChild(slider);

  return {
    container,
    updateValue: (v: number) => {
      slider.value = String(v);
      const displayVal = step < 0.01 ? v.toFixed(4) : step < 0.1 ? v.toFixed(2) : String(v);
      valSpan.textContent = `${displayVal}${unit}`;
    }
  };
}

export function createChipGroup<T extends string>(
  items: { id: T; label: string; swatches?: string[] }[],
  activeId: T,
  columns: number = 3,
  onSelect: (id: T) => void
): { container: HTMLElement; setActive: (id: T) => void } {
  const container = document.createElement('div');
  container.className = `chip-grid ${columns === 4 ? 'chip-grid-4' : ''}`;

  const buttons: Map<T, HTMLButtonElement> = new Map();

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip-btn ${item.id === activeId ? 'active' : ''}`;
    btn.setAttribute('data-id', item.id);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'chip-label';
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    if (item.swatches && item.swatches.length > 0) {
      const preview = document.createElement('div');
      preview.className = 'palette-preview';
      item.swatches.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = color;
        preview.appendChild(swatch);
      });
      btn.appendChild(preview);
    }

    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(item.id);
    });

    buttons.set(item.id, btn);
    container.appendChild(btn);
  });

  return {
    container,
    setActive: (id: T) => {
      buttons.forEach((b, key) => {
        if (key === id) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }
  };
}
