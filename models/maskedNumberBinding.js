module.exports = function(sequelize, DataTypes) {
  return sequelize.define("Masked-Number-Binding", {
    maskedNumber: {
      type: DataTypes.STRING,
      field: "masked_number",
      allowNull: false
    },
    numberOne: {
      type: DataTypes.STRING,
      field: "number_one",
      allowNull: false
    },
    numberTwo: {
      type: DataTypes.STRING,
      field: "number_two",
      allowNull: false
    }
  });
};
