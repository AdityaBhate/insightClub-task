import bcrypt from "bcrypt";
import StudentLogin from "../model/studentsLogin.js";
import userOtpVerification from "../model/userOtpVerification.js";
import { sendOTPVerifcationMail } from "./sendOTPVerifcationMail.js";

//handling logins and sign-ups

//login
export const getStudentID = async (req, res) => {
	const { username, password } = req.body;
	StudentLogin.findOne({ username: username }, async (err, doc) => {
		if (!doc) {
			return res.json({ Auth: "User not found" });
		}
		if (await bcrypt.compare(password, doc.password)) {
			return res.json({ Auth: "success" });
		} else {
			res.json({ Auth: "username or password incorrect" });
		}
	});
};

//sign-up
export const createStudentID = async (req, res) => {
	const { username, password, email } = req.body;
	const hashedPassword = await bcrypt.hash(password, 10);
	const newUser = new StudentLogin({
		username: username,
		email: email,
		password: hashedPassword,
		verified: false,
	});
	try {
		await newUser.save().then((result) => {
			sendOTPVerifcationMail(result, res);
			res.json(newUser);
		});
	} catch (error) {
		console.log(error);
	}
};

export const verifyOTP = async (req, res) => {
	try {
		const { _id, otp } = req.body;
		await userOtpVerification.findOne(
			{
				_id: _id,
			},
			async (err, doc) => {
				if (!doc) {
					return res.json({
						message:
							"Account does not exist or has been verified. Please login or signup again",
					});
				}
				// checking for expired otp
				if (doc.expiredAt < Date.now()) {
					await userOtpVerification.deleteMany({ _id: _id });
					return res.json({ OTPstatus: "OTP expired" });
				}
				//validating OTP
				else {
					const validateOTP = await bcrypt.compare(otp, doc.otp);
					if (validateOTP) {
						await StudentLogin.updateOne({ _id: _id }, { verified: true });
						await userOtpVerification.deleteMany({ _id: _id });
						res.json({ OTPstatus: "OTP verification success" });
					} else {
						res.json({ OTPstatus: "OTP didnt match" });
					}
				}
			}
		);
	} catch (error) {
		res.json({
			Status: "Verification Failed",
			Message: error.Message,
		});
	}
};
