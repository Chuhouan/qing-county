/**
 * TownSector - 乡镇产业地块模型（精简版）
 * ========================================
 * 地块只保留命名空间，供 UI 展示和事件锚点使用。
 * 产值/用工/税收由 EconomicSystem 在县层面汇总计算。
 * 删除了以下裱花字段：
 *   output, capacity, capacityUtilization, employees,
 *   basePrice, currentPrice, priceElasticity,
 *   profit, tax, level, stage, equipmentAge, techLevel,
 *   pollution, enterpriseHealth, upstream, upstreamSupply,
 *   enterpriseId, operatingCost, active, _monthsInStage
 * 以及全部方法：calcEffectiveOutput, calcTax, monthlyUpdate, _evolveStage
 */
class TownSector {
  constructor(data = {}) {
    this.id = data.id || `sec_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    this.townId = data.townId || '';
    this.type = data.type || 'agriculture';  // agriculture | industry | service | tourism
    this.subType = data.subType || 'grain';
    this.name = data.name || '未命名产业地块';
  }

  toJSON() {
    return {
      id: this.id,
      townId: this.townId,
      type: this.type,
      subType: this.subType,
      name: this.name,
    };
  }
}
