/**
 * Menghitung Compound Interest (Bunga Majemuk)
 * 
 * @param {number} principal - Modal awal.
 * @param {number} rate - Suku bunga tahunan (contoh: 0.05 untuk 5%).
 * @param {number} time - Jangka waktu dalam tahun.
 * @param {number} frequency - Berapa kali bunga diberikan dalam setahun.
 * @returns {number} Total nilai akhir.
 */
function calculateCompoundInterest(principal, rate, time, frequency) {
  const amount = principal * Math.pow((1 + rate / frequency), frequency * time);
  return amount;
}

module.exports = {
  calculateCompoundInterest
};
