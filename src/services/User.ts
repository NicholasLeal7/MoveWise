import User from "../models/User";

type User = {
    name: string,
    username: string,
    email: string,
    password: string
}

type UpdatedUser = {
    profession: string
    costOfLiving: number,
    favoriteContinent: string[],
    languages: string[],
    originCountry: string,
    salary: number,
    salaryExpect: number
}

export const findUserById = async (id: number) => {
    return await User.findById(id);
};

export const findUserByUsername = async (username: string) => {
    return await User.findOne({
        username: username
    });
};

export const createUser = async (data: User) => {
    const newUser = new User({
        username: data.username,
        name: data.name,
        email: data.email,
        password: data.password
    });
    return await newUser.save();
};

export const updateUserPreferences = async (username: string, data: UpdatedUser) => {
    console.log('dados', data);
    return await User.findOneAndUpdate(
        { username: username },
        {
            profession: data.profession,
            costOfLiving: data.costOfLiving,
            favoriteContinent: data.favoriteContinent,
            languages: data.languages,
            originCountry: data.originCountry,
            salary: data.salary,
            salaryExpect: data.salaryExpect
        },
        { new: true }
    );
};