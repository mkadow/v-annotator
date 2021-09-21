import { Entity, LevelManager } from "../Label/Entity";
import { LabelList } from "../Label/Label";
import { TextLine } from "./TextLine";
import { Font } from "./Font";
import config from "@/domain/models/Config/Config";
const marginTop = 5;

export interface GeometricEntity {
  entity: Entity;
  ranges: Ranges;
  lineY: number;
  textY: number;
}

class Range {
  constructor(readonly x1: number, readonly x2: number) {}
}

export class Ranges {
  private _items: Range[] = [];
  constructor(readonly rtl = false) {}

  get items(): Range[] {
    return this.rtl ? this._items.reverse() : this._items;
  }

  add(x1: number, x2: number): void {
    const range = new Range(x1, x2);
    this._items.push(range);
  }

  get first(): Range {
    return this.items[0];
  }
}

function elementExists(element: SVGTextElement): boolean {
  return element.textLength.baseVal.value !== 0;
}

export class EntityLine {
  private levelManager = new LevelManager();
  constructor(
    private entities: Entity[],
    private entityLabels: LabelList,
    private textLine: TextLine,
    private font: Font
  ) {}

  render(element: SVGTextElement, rtl = false): GeometricEntity[] {
    if (!elementExists(element)) {
      return [];
    }
    const geometricEntities: GeometricEntity[] = [];
    this.levelManager.clear();
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      const ranges = this.createRanges(element, entity, rtl);
      this.levelManager.update(
        entity,
        ranges.items.map((range, index) =>
          index === 0 // If it's the first element,
            ? [
                range.x1,
                // consider label length,
                Math.max(
                  range.x2,
                  range.x1 + this.entityLabels.getById(entity.label)!.width
                ),
              ]
            : [range.x1, range.x2]
        )
      );
      const lineY = this.calculateLineY(entity);
      const textY = this.calculateTextY(entity);
      geometricEntities.push({
        entity,
        ranges,
        lineY,
        textY,
      });
    }
    return geometricEntities;
  }

  private calculateLineY(entity: Entity): number {
    const level = this.levelManager.fetchLevel(entity)!;
    const marginBottom = 8;
    return (
      config.lineWidth +
      (config.lineWidth + this.font.fontSize + marginBottom) * level
    );
  }

  private calculateTextY(entity: Entity): number {
    const lineY = this.calculateLineY(entity);
    return lineY + this.font.fontSize / 2 + marginTop;
  }

  private createRanges(
    element: SVGTextElement,
    entity: Entity,
    rtl: boolean
  ): Ranges {
    const ranges = new Ranges(rtl);
    const node = element.firstChild!;
    const s =
      Math.max(entity.startOffset, this.textLine.startOffset) -
      this.textLine.startOffset;
    const e =
      Math.min(entity.endOffset, this.textLine.endOffset) -
      this.textLine.startOffset;
    if (node.textContent && node.textContent.length < e) {
      ranges.add(0, 0);
      return ranges;
    }
    const range = document.createRange();
    range.setStart(node, s);
    range.setEnd(node, e);
    const rects = range.getClientRects();
    for (const rect of rects) {
      ranges.add(rect.left, rect.right);
    }
    return ranges;
  }
}
