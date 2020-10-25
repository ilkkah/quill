import merge from 'lodash.merge';
import Emitter from '../core/emitter';
import BaseTheme, { BaseTooltip } from './base';
import { Range } from '../core/selection';
import icons from '../ui/icons';
import LinkBlot from '../formats/link';

const TOOLBAR_CONFIG = [
  ['bold', 'italic', 'link'],
  [{ header: 1 }, { header: 2 }, 'blockquote'],
];

class BubbleTooltip extends BaseTooltip {
  constructor(quill, bounds) {
    super(quill, bounds);
    this.quill.on(
      Emitter.events.EDITOR_CHANGE,
      (type, range, oldRange, source) => {
        if (type !== Emitter.events.SELECTION_CHANGE) return;
        if (
          range != null &&
          range.length > 0 &&
          source === Emitter.sources.USER
        ) {
          this.show();
          // Lock our width so we will expand beyond our offsetParent boundaries
          this.root.style.left = '0px';
          this.root.style.width = '';
          this.root.style.width = `${this.root.offsetWidth}px`;
          const lines = this.quill.getLines(range.index, range.length);
          if (lines.length === 1) {
            this.position(this.quill.getBounds(range));
          } else {
            const lastLine = lines[lines.length - 1];
            const index = this.quill.getIndex(lastLine);
            const length = Math.min(
              lastLine.length() - 1,
              range.index + range.length - index,
            );
            const indexBounds = this.quill.getBounds(new Range(index, length));
            this.position(indexBounds);
          }
        } else if (
          document.activeElement !== this.textbox &&
          this.quill.hasFocus()
        ) {
          this.hide();
        }
      },
    );
  }

  listen() {
    super.listen();
    this.root.querySelector('.ql-close').addEventListener('click', () => {
      this.root.classList.remove('ql-editing');
    });
    this.quill.on(Emitter.events.SCROLL_OPTIMIZE, () => {
      // Let selection be restored by toolbar handlers before repositioning
      setTimeout(() => {
        if (this.root.classList.contains('ql-hidden')) return;
        const range = this.quill.getSelection();
        if (range != null) {
          this.position(this.quill.getBounds(range));
        }
      }, 1);
    });
  }

  cancel() {
    this.hide();
  }

  position(reference) {
    const shift = super.position(reference);
    const arrow = this.root.querySelector('.ql-tooltip-arrow');
    arrow.style.marginLeft = '';
    if (shift !== 0) {
      arrow.style.marginLeft = `${-1 * shift - arrow.offsetWidth / 2}px`;
    }
    return shift;
  }
}
BubbleTooltip.TEMPLATE = [
  '<span class="ql-tooltip-arrow"></span>',
  '<div class="ql-tooltip-editor">',
  '<input type="text" data-formula="e=mc^2" data-link="https://aamu.app" data-video="Embed URL">',
  '<i class="ql-save ql-bubble-icon"></i>',
  '<i class="ql-remove ql-bubble-icon"></i>',
  '<a class="ql-close"></a>',
  '</div>',
].join('');

class BubbleTheme extends BaseTheme {
  constructor(quill, options) {
    if (
      options.modules.toolbar != null &&
      options.modules.toolbar.container == null
    ) {
      options.modules.toolbar.container = TOOLBAR_CONFIG;
    }
    super(quill, options);
    this.quill.container.classList.add('ql-bubble');
  }

  extendToolbar(toolbar) {
    this.tooltip = new BubbleTooltip(this.quill, this.options.bounds);
    this.tooltip.root.appendChild(toolbar.container);
    this.buildButtons(toolbar.container.querySelectorAll('button'), icons);
    this.buildPickers(toolbar.container.querySelectorAll('select'), icons);

    if (toolbar.container.querySelector('.ql-link')) {
      this.quill.keyboard.addBinding(
        { key: 'k', shortKey: true },
        (range, context) => {
          toolbar.handlers.link.call(toolbar, !context.format.link);
        },
      );
    }
  }
}
BubbleTheme.DEFAULTS = merge({}, BaseTheme.DEFAULTS, {
  modules: {
    toolbar: {
      handlers: {
        link(value) {
          if (!value) {
            var range = this.quill.getSelection();

            if (range) {
              const [link, offset] = this.quill.scroll.descendant(
                LinkBlot,
                range.index,
              );

              if (link != null) {
                this.linkRange = new Range(range.index - offset, link.length());
                const preview = LinkBlot.formats(link.domNode);
                this.quill.bubbleTheme.tooltip.edit('link', preview.href);
              }
            }
          } else {
            this.quill.bubbleTheme.tooltip.edit();
          }
        },
      },
    },
  },
});

export { BubbleTooltip, BubbleTheme as default };