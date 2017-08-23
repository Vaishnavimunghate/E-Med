module.exports = function(sequelize, DataTypes) {
    var Doctor = sequelize.define("doctors", {
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 45]
            }
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 45]
            }
        },
        telephone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        appointments: DataTypes.STRING,
        image: DataTypes.TEXT
    });
    return Doctor;
}