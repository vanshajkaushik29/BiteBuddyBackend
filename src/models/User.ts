import mongoose, {Document} from "mongoose"

export interface IUser extends Document{
    name:string;
    email:string;
    phone:string;
    password:string;
    pg:mongoose.Types.ObjectId;
    profilePic?:string,
    averageRating:number,
    ratingCount:number,
    rewardPoints:number

}


const userSchema = new mongoose.Schema<IUser>({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    phone:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    password:{
        type:String,
        required:true
    },
    pg:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'PG',
        required: true
    },
    profilePic:{
        type:String
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },

    ratingCount: {
        type: Number,
        default: 0,
    },
    rewardPoints:{
        type:Number,
        default:0
    }
},{timestamps:true}
)


const User = mongoose.model<IUser>("User",userSchema);

export default User;